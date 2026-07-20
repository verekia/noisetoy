// TSL composer, mirroring the GLSL/WGSL builders: per-layer value functions
// with deduplicated dependency chunks, octave/style operator, and the
// bottom-to-top blend fold. The output is JavaScript source using the
// three/tsl API — the same text is evaluated for the Three.js backend and
// exported verbatim by Copy TSL.

import { COMMON_TSL } from '../noises/common.tsl'
import { TILE_REPEAT, translationVelocity, WARP_BLEND_STRENGTH, Z_SPEED } from './types'

import type { BlendMode, LayerConfig, RenderConfig } from './types'

/** Identifiers the composed code expects from the three/tsl namespace. */
export const TSL_IMPORTS = [
  'Fn',
  'If',
  'Loop',
  'select',
  'float',
  'int',
  'uint',
  'vec2',
  'vec3',
  'vec4',
  'mat3',
  'mix',
  'dot',
  'length',
  'floor',
  'fract',
  'abs',
  'min',
  'max',
  'clamp',
  'sqrt',
  'cos',
  'sin',
  'exp',
  'atan',
  'mod',
] as const

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
  const lTiled = !solid && tiled && L.variant.tslTileable !== null
  const shaderSpec = lTiled && L.variant.tslTileable ? L.variant.tslTileable : L.variant.tsl
  const value = lTiled
    ? `const lv${i} = Fn(([p, per]) => ${shaderSpec.expr})`
    : `const lv${i} = Fn(([p]) => ${shaderSpec.expr})`
  const s = L.scale
  const [vx, vy] = translationVelocity(L.speed, L.angle)
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
  const call = (freq: string) =>
    lTiled ? `lv${i}(bp.mul(${freq}), vec2(${s}, ${s}).mul(${freq}))` : `lv${i}(bp.mul(${freq}))`
  const accLine =
    L.style === 'billow'
      ? 'accum.addAssign(amp.mul(nv.mul(2).sub(1).abs()))'
      : L.style === 'ridged'
        ? 'const r = nv.mul(2).sub(1).abs().oneMinus()\n    accum.addAssign(amp.mul(r).mul(r))'
        : 'accum.addAssign(amp.mul(nv.sub(0.5)))'
  const finalExpr =
    L.style === 'basic' ? 'accum.div(sumSq.sqrt()).add(0.5).clamp(0.0, 1.0)' : 'accum.div(sumAmp).clamp(0.0, 1.0)'
  const body =
    L.octaves === 1 && L.style === 'basic'
      ? `  return ${call('1.0')}`
      : `  const accum = float(0).toVar()
  const amp = float(1).toVar()
  const freq = float(1).toVar()
  const sumAmp = float(0).toVar()
  const sumSq = float(0).toVar()
  Loop(${L.octaves}, () => {
    const nv = ${call('freq')}
    ${accLine}
    sumAmp.addAssign(amp)
    sumSq.addAssign(amp.mul(amp))
    amp.mulAssign(${L.gain})
    freq.mulAssign(2)
  })
  return ${finalExpr}`
  return `${value}
const layerVal${i} = Fn(([${solid ? 'p' : 'uv'}, t]) => {
  ${bp}
${body}
})`
}

/** Composed TSL body: dep chunks + layer functions + an `effect(uv, z)` Fn. */
export const buildTslBody = (cfg: RenderConfig): string => {
  const { layers, tiled } = cfg
  const solid = cfg.domain === 'position'
  const chunks: string[] = [COMMON_TSL]
  const seen = new Set<string>(chunks)
  const fns: string[] = []
  const mainLines: string[] = []
  layers.forEach((L, i) => {
    const lTiled = !solid && tiled && L.variant.tslTileable !== null
    const shaderSpec = lTiled && L.variant.tslTileable ? L.variant.tslTileable : L.variant.tsl
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
  return acc
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
