// WGSL composer: turns a layer stack into one vertex+fragment shader module,
// mirroring glsl.ts (per-layer value functions, deduplicated dependency
// chunks, bottom-to-top blend fold, 'warp' uv displacement).

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

const f = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`)

const requireWgsl = (L: LayerConfig, i: number): ShaderSpec => {
  const spec = L.noise.wgsl
  if (!spec) throw new Error(`layer ${i} has no WGSL spec: set \`wgsl\` on its noise from the ...Wgsl exports`)
  return spec
}

/** WGSL matrix constructors are column-major; the shared matrices are row-major. */
const rotMat = (dim: 2 | 3): string => {
  const m = dim === 3 ? OCTAVE_ROT3 : OCTAVE_ROT2
  const cols = dim === 3 ? [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]] : [m[0], m[2], m[1], m[3]]
  return `mat${dim}x${dim}f(${cols.map(c => f(c as number)).join(', ')})`
}

const blendExpr = (mode: BlendMode, a: string, v: string): string => {
  switch (mode) {
    case 'add':
      return `min(${a} + ${v}, 1.0)`
    case 'multiply':
      return `${a} * ${v}`
    case 'screen':
      return `1.0 - (1.0 - ${a}) * (1.0 - ${v})`
    case 'overlay':
      return `select(1.0 - 2.0 * (1.0 - ${a}) * (1.0 - ${v}), 2.0 * ${a} * ${v}, ${a} < 0.5)`
    case 'difference':
      return `abs(${a} - ${v})`
    case 'darken':
      return `min(${a}, ${v})`
    case 'lighten':
      return `max(${a}, ${v})`
    default:
      return v // 'normal' and 'warp'
  }
}

const layerFunctions = (L: LayerConfig, i: number, tiled: boolean): string => {
  const rotated = L.rotate && L.octaves > 1
  const lTiled = tiled && L.noise.wgslTileable != null && !rotated
  const shaderSpec = lTiled && L.noise.wgslTileable ? L.noise.wgslTileable : requireWgsl(L, i)
  const vec = `vec${shaderSpec.dim}f`
  const value = lTiled
    ? `fn lv${i}(p: ${vec}, per: vec2f) -> f32 { return ${shaderSpec.expr}; }`
    : `fn lv${i}(p: ${vec}) -> f32 { return ${shaderSpec.expr}; }`
  const s = f(L.scale)
  const [vx, vy] = translationVelocity(L.speed, L.angle, L.scale)
  const drift = vx || vy ? ` + vec2f(${f(vx)}, ${f(vy)}) * t` : ''
  const bp =
    shaderSpec.dim === 3 ? `let bp = vec3f(uv * ${s}${drift}, t * ${f(Z_SPEED)});` : `let bp = uv * ${s}${drift};`
  const call = (p: string) => (lTiled ? `lv${i}(${p}, vec2f(${s}, ${s}) * freq)` : `lv${i}(${p})`)
  const one = (p: string) => (lTiled ? `lv${i}(${p}, vec2f(${s}, ${s}))` : `lv${i}(${p})`)
  const [offX, offY, offZ] = OCTAVE_OFFSET
  const offStep = shaderSpec.dim === 3 ? `vec3f(${f(offX)}, ${f(offY)}, ${f(offZ)})` : `vec2f(${f(offX)}, ${f(offY)})`
  const offZero = shaderSpec.dim === 3 ? 'vec3f(0.0)' : 'vec2f(0.0)'
  const accLine =
    L.style === 'billow'
      ? 'accum += amp * abs(2.0 * nv - 1.0);'
      : L.style === 'ridged'
        ? `let r = max(1.0 - abs(2.0 * nv - 1.0), 0.0); let sig = r * r * weight; accum += amp * sig; weight = clamp(sig * ${f(RIDGE_FEEDBACK)}, 0.0, 1.0);`
        : 'accum += amp * (nv - 0.5);'
  // The falloff is fixed, so the normalizer is a codegen-time constant.
  const finalExpr =
    L.style === 'basic' ? `0.5 + accum * ${f(1 / fractalRms(L.octaves))}` : `accum * ${f(1 / fractalAmpSum(L.octaves))}`
  const body =
    L.octaves === 1 && L.style === 'basic'
      ? `return clamp(${one('bp')}, 0.0, 1.0);`
      : rotated
        ? `var accum = 0.0;
  var amp = 1.0;${L.style === 'ridged' ? '\n  var weight = 1.0;' : ''}
  let m = ${rotMat(shaderSpec.dim)};
  var q = bp;
  for (var o = 0; o < ${L.octaves}; o++) {
    let nv = ${call('q')};
    ${accLine}
    amp *= ${f(FRACTAL_GAIN)};
    q = m * q;
  }
  return clamp(${finalExpr}, 0.0, 1.0);`
        : `var accum = 0.0;
  var amp = 1.0;
  var freq = 1.0;${L.style === 'ridged' ? '\n  var weight = 1.0;' : ''}
  var off = ${offZero};
  for (var o = 0; o < ${L.octaves}; o++) {
    let nv = ${call('bp * freq + off')};
    ${accLine}
    amp *= ${f(FRACTAL_GAIN)};
    freq *= 2.0;
    off += ${offStep};
  }
  return clamp(${finalExpr}, 0.0, 1.0);`
  return `${value}
fn layerVal${i}(uv: vec2f, t: f32) -> f32 {
  ${bp}
  ${body}
}`
}

export const buildWgslShader = (cfg: RenderConfig): string => {
  const { layers, tiled } = cfg
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
    const lTiled = tiled && L.noise.wgslTileable != null
    const shaderSpec = lTiled && L.noise.wgslTileable ? L.noise.wgslTileable : requireWgsl(L, i)
    for (const dep of shaderSpec.deps) {
      if (!seen.has(dep)) {
        seen.add(dep)
        chunks.push(dep)
      }
    }
    fns.push(layerFunctions(L, i, tiled))
    if (L.blend === 'warp') {
      mainLines.push(`let d${i} = (acc - 0.5) * ${f(WARP_BLEND_STRENGTH)}; uvw = uv + vec2f(d${i}, -d${i});`)
    } else {
      mainLines.push('uvw = uv;')
    }
    mainLines.push(`let v${i} = layerVal${i}(uvw, u.t);`)
    mainLines.push(`acc = mix(acc, ${blendExpr(L.blend, 'acc', `v${i}`)}, ${f(L.opacity)});`)
  })
  return `
struct Uniforms {
  res: vec2f,
  t: f32,
  pad: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(pos[vi], 0.0, 1.0);
}
${chunks.join('\n')}
${fns.join('\n')}
@fragment fn fs(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
  var uv = fragPos.xy / u.res;
  ${tiled ? `uv = fract(uv * ${f(TILE_REPEAT)});` : ''}
  var acc = 0.0;
  var uvw = vec2f(0.0);
  ${mainLines.join('\n  ')}
  ${
    steps
      ? `let sp = acc * ${f(steps)};
  let sb = floor(sp);
  acc = min(sb + smoothstep(${f(1 - smoothing)}, 1.0, sp - sb), ${f(steps - 1)}) / ${f(steps - 1)};`
      : band
        ? `acc = smoothstep(${f(bandLo)}, ${f(bandLo + be)}, acc) - smoothstep(${f(bandHi - be)}, ${f(bandHi)}, acc);`
        : ''
  }
  return vec4f(acc, acc, acc, 1.0);
}
`
}
