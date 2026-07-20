import { expect, test } from 'bun:test'

import { getNoise, NOISES } from '../registry'
import { buildGlslFragment } from './glsl'
import { fractalRms } from './types'
import { buildWgslShader } from './wgsl'

import type { NoiseDef } from '../registry'
import type { LayerConfig } from './types'

const perlin = getNoise('perlin') ?? (NOISES[0] as NoiseDef)
const marble = getNoise('marble') ?? (NOISES[0] as NoiseDef)
const perlin3d = perlin.variants.find(v => v.dim === 3)
const marble3d = marble.variants.find(v => v.dim === 3)
if (!perlin3d || !marble3d) throw new Error('expected variants missing')

const layer = (over?: Partial<LayerConfig>): LayerConfig => ({
  variant: perlin3d,
  scale: perlin.scale,
  octaves: 1,
  rotate: false,
  style: 'basic',
  blend: 'normal',
  opacity: 1,
  speed: 0,
  angle: 0,
  ...over,
})

test('single plain layer calls its value function once, clamped at display', () => {
  const cfg = { layers: [layer()], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('return clamp(lv0(bp), 0.0, 1.0);')
  expect(wgsl).toContain('return clamp(lv0(bp), 0.0, 1.0);')
  expect(glsl).not.toContain('for (int o = 0;')
  expect(wgsl).not.toContain('for (var o = 0;')
})

test('octaves build loops with frequency scaling and decorrelation offsets', () => {
  const cfg = { layers: [layer({ octaves: 4 })], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('for (int o = 0; o < 4; o++)')
  expect(wgsl).toContain('for (var o = 0; o < 4; o++)')
  expect(glsl).toContain('lv0(bp * freq + off)')
  expect(wgsl).toContain('lv0(bp * freq + off)')
  expect(glsl).toContain('off += vec3(19.618, 27.236, 41.854);')
  expect(wgsl).toContain('off += vec3f(19.618, 27.236, 41.854);')
})

test('octaves normalize variance-preserving, via a codegen-time constant', () => {
  const glsl = buildGlslFragment({ layers: [layer({ octaves: 4 })], tiled: false, size: 512 })
  expect(glsl).toContain(`return clamp(0.5 + accum * ${1 / fractalRms(4)}, 0.0, 1.0);`)
  // No per-octave clamp: the layer value function returns the raw expression.
  expect(glsl).toContain('float lv0(vec3 p) { return 0.5 + 0.5 *')
})

test('rotate swaps the offset step for the iq rotation matrix', () => {
  const cfg = { layers: [layer({ octaves: 4, rotate: true })], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('const mat3 m = mat3(0.0, 1.616, 1.212, -1.616, 0.7272, -0.9696, -1.212, -0.9696, 1.2928);')
  expect(wgsl).toContain('let m = mat3x3f(0.0, 1.616, 1.212, -1.616, 0.7272, -0.9696, -1.212, -0.9696, 1.2928);')
  expect(glsl).toContain('q = m * q;')
  expect(glsl).not.toContain('off +=')
  // A rotated field has no period: the layer stays on the core code path even
  // in a tiled build.
  const tiled = buildGlslFragment({ layers: [layer({ octaves: 4, rotate: true })], tiled: true, size: 512 })
  expect(tiled).toContain('float lv0(vec3 p) {')
})

test('billow and ridged fold each octave; ridged carries Musgrave feedback', () => {
  const billow = buildGlslFragment({ layers: [layer({ style: 'billow' })], tiled: false, size: 512 })
  const ridged = buildWgslShader({ layers: [layer({ style: 'ridged' })], tiled: false, size: 512 })
  expect(billow).toContain('accum += amp * abs(2.0 * nv - 1.0);')
  expect(ridged).toContain('let r = max(1.0 - abs(2.0 * nv - 1.0), 0.0);')
  expect(ridged).toContain('weight = clamp(sig * 2.0, 0.0, 1.0);')
})

test('tiled octaves scale the period with the frequency', () => {
  const cfg = { layers: [layer({ octaves: 3 })], tiled: true, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('lv0(bp * freq + off, vec2(8.0, 8.0) * freq)')
  expect(wgsl).toContain('lv0(bp * freq + off, vec2f(8.0, 8.0) * freq)')
})

test('multi-layer build dedupes shared dependency chunks and folds blends', () => {
  const cfg = {
    layers: [layer(), layer({ variant: marble3d, scale: marble.scale, blend: 'multiply', opacity: 0.5 })],
    tiled: false,
    size: 512,
  }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  // Both layers depend on the Perlin chunk; it must appear exactly once.
  expect(glsl.split('float perlin3(vec3 p)').length - 1).toBe(1)
  expect(wgsl.split('fn perlin3(p: vec3f)').length - 1).toBe(1)
  expect(glsl).toContain('layerVal0(')
  expect(glsl).toContain('layerVal1(')
  expect(glsl).toContain('acc = mix(acc, acc * v1, 0.5);')
  expect(wgsl).toContain('acc = mix(acc, acc * v1, 0.5);')
})

test('warp blend displaces uv by the accumulator', () => {
  const cfg = { layers: [layer(), layer({ blend: 'warp' })], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('float d1 = (acc - 0.5) * 0.35; uvw = uv + vec2(d1, -d1);')
  expect(wgsl).toContain('let d1 = (acc - 0.5) * 0.35; uvw = uv + vec2f(d1, -d1);')
})
