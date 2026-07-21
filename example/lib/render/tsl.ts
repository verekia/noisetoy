// TSL composer, mirroring the GLSL/WGSL builders: per-layer value functions
// with deduplicated dependency chunks, octave/style operator, and the
// bottom-to-top blend fold. The output is JavaScript source using the
// three/tsl API — the same text is evaluated for the Three.js backend and
// exported verbatim by Copy TSL.

import { TSL_IMPORTS } from 'noisetoy'

import {
  FRACTAL_GAIN,
  fractalAmpSum,
  fractalRms,
  OCTAVE_OFFSET,
  OCTAVE_ROT2,
  OCTAVE_ROT3,
  RIDGE_FEEDBACK,
  BAND_SMOOTHING,
  STEP_SMOOTHING,
  TILE_REPEAT,
  translationVelocity,
  WARP_BLEND_STRENGTH,
  Z_SPEED,
} from './types'

import type { ShaderSpec } from 'noisetoy'

import type { BlendMode, LayerConfig, RenderConfig } from './types'

const requireTsl = (L: LayerConfig, i: number): ShaderSpec => {
  const spec = L.noise.tsl
  if (!spec) throw new Error(`layer ${i} has no TSL spec: set \`tsl\` on its noise from the ...Tsl exports`)
  return spec
}

export { TSL_IMPORTS }

/**
 * One row of the rotated-octave step as TSL method chains, skipping zero
 * coefficients. The shared matrices are row-major, so rows apply directly.
 */
const rotRow = (coeffs: [string, number][]): string => {
  const terms = coeffs.filter(([, c]) => c !== 0).map(([axis, c]) => `q.${axis}.mul(${c})`)
  return terms.reduce((acc, t) => (acc ? `${acc}.add(${t})` : t))
}

const rotFn = (name: string, dim: 2 | 3): string => {
  if (dim === 3) {
    const m = OCTAVE_ROT3 as number[]
    const row = (o: number) =>
      rotRow([
        ['x', m[o] as number],
        ['y', m[o + 1] as number],
        ['z', m[o + 2] as number],
      ])
    return `const ${name} = Fn(([q]) => vec3(${row(0)}, ${row(3)}, ${row(6)}))`
  }
  const m = OCTAVE_ROT2 as number[]
  const row = (o: number) =>
    rotRow([
      ['x', m[o] as number],
      ['y', m[o + 1] as number],
    ])
  return `const ${name} = Fn(([q]) => vec2(${row(0)}, ${row(2)}))`
}

const blendExpr = (mode: BlendMode, a: string, v: string): string => {
  switch (mode) {
    case 'add':
      return `${a}.add(${v}).min(1.0)`
    case 'multiply':
      return `${a}.mul(${v})`
    case 'screen':
      return `${a}.oneMinus().mul(${v}.oneMinus()).oneMinus()`
    case 'overlay':
      return `select(${a}.lessThan(0.5), ${a}.mul(${v}).mul(2.0), ${a}.oneMinus().mul(${v}.oneMinus()).mul(2.0).oneMinus())`
    case 'difference':
      return `${a}.sub(${v}).abs()`
    case 'darken':
      return `${a}.min(${v})`
    case 'lighten':
      return `${a}.max(${v})`
    default:
      return v // 'normal' and 'warp'
  }
}

const layerFunctions = (L: LayerConfig, i: number, tiled: boolean, solid: boolean): string => {
  const rotated = L.rotate && L.octaves > 1
  const lTiled = !solid && tiled && L.noise.tslTileable != null && !rotated
  const shaderSpec = lTiled && L.noise.tslTileable ? L.noise.tslTileable : requireTsl(L, i)
  const value = lTiled
    ? `const lv${i} = Fn(([p, per]) => ${shaderSpec.expr})`
    : `const lv${i} = Fn(([p]) => ${shaderSpec.expr})`
  const s = L.scale
  const [vx, vy] = translationVelocity(L.speed, L.angle, L.scale)
  const drift = vx || vy ? `.add(vec2(${vx}, ${vy}).mul(t))` : ''
  // In the solid domain the whole 3D point is the sample position, so the z
  // slice becomes a drift through the volume instead of a plane offset.
  const solidDrift = `.add(vec3(${vx}, ${vy}, ${Z_SPEED}).mul(t))`
  const bp = solid
    ? shaderSpec.dim === 3
      ? `const bp = p.mul(${s})${solidDrift}`
      : `const bp = p.xy.mul(${s})${drift}`
    : shaderSpec.dim === 3
      ? `const bp = vec3(uv.mul(${s})${drift}, t.mul(${Z_SPEED}))`
      : `const bp = uv.mul(${s})${drift}`
  const call = (p: string) => (lTiled ? `lv${i}(${p}, vec2(${s}, ${s}).mul(freq))` : `lv${i}(${p})`)
  const one = (p: string) => (lTiled ? `lv${i}(${p}, vec2(${s}, ${s}))` : `lv${i}(${p})`)
  const [offX, offY, offZ] = OCTAVE_OFFSET
  const offStep = shaderSpec.dim === 3 ? `vec3(${offX}, ${offY}, ${offZ})` : `vec2(${offX}, ${offY})`
  const offZero = shaderSpec.dim === 3 ? 'vec3(0.0)' : 'vec2(0.0)'
  const accLine =
    L.style === 'billow'
      ? 'accum.addAssign(amp.mul(nv.mul(2).sub(1).abs()))'
      : L.style === 'ridged'
        ? `const r = nv.mul(2).sub(1).abs().oneMinus().max(0.0)
    const sig = r.mul(r).mul(weight)
    accum.addAssign(amp.mul(sig))
    weight.assign(sig.mul(${RIDGE_FEEDBACK}).clamp(0.0, 1.0))`
        : 'accum.addAssign(amp.mul(nv.sub(0.5)))'
  // The falloff is fixed, so the normalizer is a codegen-time constant.
  const finalExpr =
    L.style === 'basic'
      ? `accum.mul(${1 / fractalRms(L.octaves)}).add(0.5).clamp(0.0, 1.0)`
      : `accum.mul(${1 / fractalAmpSum(L.octaves)}).clamp(0.0, 1.0)`
  const body =
    L.octaves === 1 && L.style === 'basic'
      ? `  return ${one('bp')}.clamp(0.0, 1.0)`
      : rotated
        ? `  const accum = float(0).toVar()
  const amp = float(1).toVar()${L.style === 'ridged' ? '\n  const weight = float(1).toVar()' : ''}
  const q = ${shaderSpec.dim === 3 ? 'vec3' : 'vec2'}(bp).toVar()
  Loop(${L.octaves}, () => {
    const nv = ${call('q')}
    ${accLine}
    amp.mulAssign(${FRACTAL_GAIN})
    q.assign(rot${i}(q))
  })
  return ${finalExpr}`
        : `  const accum = float(0).toVar()
  const amp = float(1).toVar()
  const freq = float(1).toVar()${L.style === 'ridged' ? '\n  const weight = float(1).toVar()' : ''}
  const off = ${offZero}.toVar()
  Loop(${L.octaves}, () => {
    const nv = ${call('bp.mul(freq).add(off)')}
    ${accLine}
    amp.mulAssign(${FRACTAL_GAIN})
    freq.mulAssign(2)
    off.addAssign(${offStep})
  })
  return ${finalExpr}`
  return `${value}${rotated ? `\n${rotFn(`rot${i}`, shaderSpec.dim)}` : ''}
const layerVal${i} = Fn(([${solid ? 'p' : 'uv'}, t]) => {
  ${bp}
${body}
})`
}

/** Composed TSL body: dep chunks + layer functions + an `effect(uv, z)` Fn. */
export const buildTslBody = (cfg: RenderConfig): string => {
  const { layers, tiled } = cfg
  const solid = cfg.domain === 'position'
  const steps = cfg.steps && cfg.steps >= 2 ? cfg.steps : 0
  const smoothing = cfg.stepSmoothing ?? STEP_SMOOTHING
  const band = cfg.band ?? null
  const be = band ? Math.min(cfg.bandSmoothing ?? BAND_SMOOTHING, band.width / 2) : 0
  const bandLo = band ? band.center - band.width / 2 : 0
  const bandHi = band ? band.center + band.width / 2 : 0
  // Specs carry their full dependency chains (common chunk included), so the
  // build is just an ordered dedupe across layers.
  const chunks: string[] = []
  const seen = new Set<string>()
  const fns: string[] = []
  const mainLines: string[] = []
  layers.forEach((L, i) => {
    const lTiled = !solid && tiled && L.noise.tslTileable != null
    const shaderSpec = lTiled && L.noise.tslTileable ? L.noise.tslTileable : requireTsl(L, i)
    for (const dep of shaderSpec.deps) {
      if (!seen.has(dep)) {
        seen.add(dep)
        chunks.push(dep)
      }
    }
    fns.push(layerFunctions(L, i, tiled, solid))
    if (L.blend === 'warp') {
      mainLines.push(`const d${i} = acc.sub(0.5).mul(${WARP_BLEND_STRENGTH})`)
      mainLines.push(
        solid
          ? `const uvw${i} = uv.add(vec3(d${i}, d${i}.negate(), 0))`
          : `const uvw${i} = uv.add(vec2(d${i}, d${i}.negate()))`,
      )
    } else {
      mainLines.push(`const uvw${i} = uv`)
    }
    mainLines.push(`const v${i} = layerVal${i}(uvw${i}, t)`)
    mainLines.push(`acc.assign(mix(acc, ${blendExpr(L.blend, 'acc', `v${i}`)}, ${L.opacity}))`)
  })
  return `${chunks.join('\n')}
${fns.join('\n')}
const effect = Fn(([uvIn, t]) => {
  const uv = ${!solid && tiled ? `fract(uvIn.mul(${TILE_REPEAT})).toVar()` : 'uvIn.toVar()'}
  const acc = float(0).toVar()
  ${mainLines.join('\n  ')}
  ${steps ? `const sp = acc.mul(${steps})\n  const sb = sp.floor()` : ''}
  return ${
    steps
      ? `sb.add(smoothstep(float(${1 - smoothing}), float(1), sp.sub(sb))).min(${steps - 1}).div(${steps - 1})`
      : band
        ? `smoothstep(float(${bandLo}), float(${bandLo + be}), acc).sub(smoothstep(float(${bandHi - be}), float(${bandHi}), acc))`
        : 'acc'
  }
})`
}

/** Full standalone module for Copy TSL, with the three/tsl import header. */
export const buildTslModule = (cfg: RenderConfig): string => `// Generated by noisetoy (github.com/verekia/noisetoy)
// Usage with a Three.js WebGPURenderer node material:
//   material.colorNode = vec3(effect(uv(), timeUniform))
// uv is the [0,1) sample position (y down in this repo's convention) and the
// second argument is elapsed seconds, which drives the z slice of 3D layers
// and any layer translation (pass float(0) for a static image).
import { ${TSL_IMPORTS.join(', ')} } from 'three/tsl'

${buildTslBody(cfg)}

export default effect
`
