// GLSL ES 3.00 composer: turns a layer stack into one fragment shader. Each
// layer gets its own value function (with per-layer scale, octaves, and
// style); dependency chunks shared between layers are included once. Layers
// fold bottom-to-top with Photoshop-style blends; the 'warp' blend displaces a
// layer's uv by the accumulated value beneath it.

import { COMMON_GLSL } from '../noises/common.glsl'
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
      return `${a} < 0.5 ? 2.0 * ${a} * ${v} : 1.0 - 2.0 * (1.0 - ${a}) * (1.0 - ${v})`
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
  const lTiled = tiled && L.variant.glslTileable !== null
  const shaderSpec = lTiled && L.variant.glslTileable ? L.variant.glslTileable : L.variant.glsl
  const vec = `vec${shaderSpec.dim}`
  const value = lTiled
    ? `float lv${i}(${vec} p, vec2 per) { return ${shaderSpec.expr}; }`
    : `float lv${i}(${vec} p) { return ${shaderSpec.expr}; }`
  const s = f(L.scale)
  const [vx, vy] = translationVelocity(L.speed, L.angle)
  const drift = vx || vy ? ` + vec2(${f(vx)}, ${f(vy)}) * t` : ''
  const bp =
    shaderSpec.dim === 3 ? `vec3 bp = vec3(uv * ${s}${drift}, t * ${f(Z_SPEED)});` : `vec2 bp = uv * ${s}${drift};`
  const call = (freq: string) => (lTiled ? `lv${i}(bp * ${freq}, vec2(${s}, ${s}) * ${freq})` : `lv${i}(bp * ${freq})`)
  const accLine =
    L.style === 'billow'
      ? 'accum += amp * abs(2.0 * nv - 1.0);'
      : L.style === 'ridged'
        ? 'float r = 1.0 - abs(2.0 * nv - 1.0); accum += amp * r * r;'
        : 'accum += amp * (nv - 0.5);'
  const finalExpr = L.style === 'basic' ? '0.5 + accum / sqrt(sumSq)' : 'accum / sumAmp'
  const body =
    L.octaves === 1 && L.style === 'basic'
      ? `return ${call('1.0')};`
      : `float accum = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  float sumAmp = 0.0;
  float sumSq = 0.0;
  for (int o = 0; o < ${L.octaves}; o++) {
    float nv = ${call('freq')};
    ${accLine}
    sumAmp += amp;
    sumSq += amp * amp;
    amp *= ${f(L.gain)};
    freq *= 2.0;
  }
  return clamp(${finalExpr}, 0.0, 1.0);`
  return `${value}
float layerVal${i}(vec2 uv, float t) {
  ${bp}
  ${body}
}`
}

export const buildGlslFragment = (cfg: RenderConfig): string => {
  const { layers, tiled } = cfg
  const chunks: string[] = [COMMON_GLSL]
  const seen = new Set<string>(chunks)
  const fns: string[] = []
  const mainLines: string[] = []
  layers.forEach((L, i) => {
    const lTiled = tiled && L.variant.glslTileable !== null
    const shaderSpec = lTiled && L.variant.glslTileable ? L.variant.glslTileable : L.variant.glsl
    for (const dep of shaderSpec.deps) {
      if (!seen.has(dep)) {
        seen.add(dep)
        chunks.push(dep)
      }
    }
    fns.push(layerFunctions(L, i, tiled))
    if (L.blend === 'warp') {
      mainLines.push(`float d${i} = (acc - 0.5) * ${f(WARP_BLEND_STRENGTH)}; uvw = uv + vec2(d${i}, -d${i});`)
    } else {
      mainLines.push('uvw = uv;')
    }
    mainLines.push(`float v${i} = layerVal${i}(uvw, u_t);`)
    mainLines.push(`acc = mix(acc, ${blendExpr(L.blend, 'acc', `v${i}`)}, ${f(L.opacity)});`)
  })
  return `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_res;
uniform float u_t;
out vec4 outColor;
${chunks.join('\n')}
${fns.join('\n')}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  ${tiled ? `uv = fract(uv * ${f(TILE_REPEAT)});` : ''}
  float acc = 0.0;
  vec2 uvw;
  ${mainLines.join('\n  ')}
  outColor = vec4(vec3(acc), 1.0);
}
`
}
