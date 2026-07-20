import { expect, test } from 'bun:test'

import { getNoise, NOISES } from '../registry'
import { buildGlslFragment } from './glsl'
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
  gain: 0.5,
  style: 'basic',
  blend: 'normal',
  opacity: 1,
  speed: 0,
  angle: 0,
  ...over,
})

test('single plain layer calls its value function once', () => {
  const cfg = { layers: [layer()], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('lv0(bp * 1.0)')
  expect(wgsl).toContain('lv0(bp * 1.0)')
  expect(glsl).not.toContain('for (int o = 0;')
  expect(wgsl).not.toContain('for (var o = 0;')
})

test('octaves build loops with frequency scaling', () => {
  const cfg = { layers: [layer({ octaves: 4 })], tiled: false, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('for (int o = 0; o < 4; o++)')
  expect(wgsl).toContain('for (var o = 0; o < 4; o++)')
  expect(glsl).toContain('lv0(bp * freq)')
  expect(wgsl).toContain('lv0(bp * freq)')
})

test('billow and ridged fold each octave', () => {
  const billow = buildGlslFragment({ layers: [layer({ style: 'billow' })], tiled: false, size: 512 })
  const ridged = buildWgslShader({ layers: [layer({ style: 'ridged' })], tiled: false, size: 512 })
  expect(billow).toContain('accum += amp * abs(2.0 * nv - 1.0);')
  expect(ridged).toContain('let r = 1.0 - abs(2.0 * nv - 1.0); accum += amp * r * r;')
})

test('tiled octaves scale the period with the frequency', () => {
  const cfg = { layers: [layer({ octaves: 3 })], tiled: true, size: 512 }
  const glsl = buildGlslFragment(cfg)
  const wgsl = buildWgslShader(cfg)
  expect(glsl).toContain('lv0(bp * freq, vec2(8.0, 8.0) * freq)')
  expect(wgsl).toContain('lv0(bp * freq, vec2f(8.0, 8.0) * freq)')
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
