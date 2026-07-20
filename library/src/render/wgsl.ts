// WGSL composer: turns a layer stack into one vertex+fragment shader module,
// mirroring glsl.ts (per-layer value functions, deduplicated dependency
// chunks, bottom-to-top blend fold, 'warp' uv displacement).

import { COMMON_WGSL } from '../noises/common.wgsl'
import { TILE_REPEAT, translationVelocity, WARP_BLEND_STRENGTH, Z_SPEED } from './types'

import type { BlendMode, LayerConfig, RenderConfig } from './types'

const f = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`)

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
  const lTiled = tiled && L.variant.wgslTileable !== null
  const shaderSpec = lTiled && L.variant.wgslTileable ? L.variant.wgslTileable : L.variant.wgsl
  const vec = `vec${shaderSpec.dim}f`
  const value = lTiled
    ? `fn lv${i}(p: ${vec}, per: vec2f) -> f32 { return ${shaderSpec.expr}; }`
    : `fn lv${i}(p: ${vec}) -> f32 { return ${shaderSpec.expr}; }`
  const s = f(L.scale)
  const [vx, vy] = translationVelocity(L.speed, L.angle)
  const drift = vx || vy ? ` + vec2f(${f(vx)}, ${f(vy)}) * t` : ''
  const bp =
    shaderSpec.dim === 3 ? `let bp = vec3f(uv * ${s}${drift}, t * ${f(Z_SPEED)});` : `let bp = uv * ${s}${drift};`
  const call = (freq: string) => (lTiled ? `lv${i}(bp * ${freq}, vec2f(${s}, ${s}) * ${freq})` : `lv${i}(bp * ${freq})`)
  const accLine =
    L.style === 'billow'
      ? 'accum += amp * abs(2.0 * nv - 1.0);'
      : L.style === 'ridged'
        ? 'let r = 1.0 - abs(2.0 * nv - 1.0); accum += amp * r * r;'
        : 'accum += amp * (nv - 0.5);'
  const finalExpr = L.style === 'basic' ? '0.5 + accum / sqrt(sumSq)' : 'accum / sumAmp'
  const body =
    L.octaves === 1 && L.style === 'basic'
      ? `return ${call('1.0')};`
      : `var accum = 0.0;
  var amp = 1.0;
  var freq = 1.0;
  var sumAmp = 0.0;
  var sumSq = 0.0;
  for (var o = 0; o < ${L.octaves}; o++) {
    let nv = ${call('freq')};
    ${accLine}
    sumAmp += amp;
    sumSq += amp * amp;
    amp *= ${f(L.gain)};
    freq *= 2.0;
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
  const chunks: string[] = [COMMON_WGSL]
  const seen = new Set<string>(chunks)
  const fns: string[] = []
  const mainLines: string[] = []
  layers.forEach((L, i) => {
    const lTiled = tiled && L.variant.wgslTileable !== null
    const shaderSpec = lTiled && L.variant.wgslTileable ? L.variant.wgslTileable : L.variant.wgsl
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
  return vec4f(acc, acc, acc, 1.0);
}
`
}
