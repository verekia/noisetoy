import { describe, expect, test } from 'bun:test'
import * as TSL from 'three/tsl'

import { NOISES } from '../registry'
import { buildTslBody, buildTslModule, TSL_IMPORTS } from './tsl'

import type { LayerConfig } from './types'

const layer = (over: Partial<LayerConfig> & Pick<LayerConfig, 'variant' | 'scale'>): LayerConfig => ({
  octaves: 1,
  gain: 0.5,
  style: 'basic',
  blend: 'normal',
  opacity: 1,
  speed: 0,
  angle: 0,
  ...over,
})

const evaluate = (body: string): ((uv: unknown, z: unknown) => unknown) => {
  const preamble = `const { ${TSL_IMPORTS.join(', ')} } = TSL\n`
  const factory = new Function('TSL', `"use strict"\n${preamble}${body}\nreturn effect`) as (
    tsl: typeof TSL,
  ) => (uv: unknown, z: unknown) => unknown
  return factory(TSL)
}

test('every TSL import exists in three/tsl', () => {
  for (const name of TSL_IMPORTS) {
    expect((TSL as Record<string, unknown>)[name]).toBeDefined()
  }
})

describe.each(NOISES.map(n => [n.name, n] as const))('%s', (_name, noise) => {
  describe.each(noise.variants.map(v => [v.label, v] as const))('%s', (_label, variant) => {
    test('TSL spec dims are consistent', () => {
      expect(variant.tsl.dim).toBe(variant.dim)
      if (variant.sampleTileable) {
        expect(variant.tslTileable?.dim).toBe(variant.dim)
      } else {
        expect(variant.tslTileable).toBeNull()
      }
    })

    test('composed TSL body evaluates and builds a node graph', () => {
      const cfg = { layers: [layer({ variant, scale: noise.scale, octaves: 2 })], tiled: false, size: 512 }
      const effect = evaluate(buildTslBody(cfg))
      expect(effect(TSL.vec2(0.3, 0.7), TSL.float(0.5))).toBeDefined()
    })

    if (variant.sampleTileable) {
      test('tiled TSL body evaluates and builds a node graph', () => {
        const cfg = { layers: [layer({ variant, scale: noise.scale })], tiled: true, size: 512 }
        const effect = evaluate(buildTslBody(cfg))
        expect(effect(TSL.vec2(0.3, 0.7), TSL.float(0.5))).toBeDefined()
      })
    }
  })
})

test('multi-layer TSL body dedupes chunks and builds with blends', () => {
  const perlin = NOISES.find(n => n.id === 'perlin')
  const marble = NOISES.find(n => n.id === 'marble')
  if (!perlin || !marble) throw new Error('expected noises missing')
  const cfg = {
    layers: [
      layer({ variant: perlin.variants[1] as never, scale: perlin.scale, octaves: 3, style: 'ridged' }),
      layer({ variant: marble.variants[1] as never, scale: marble.scale, blend: 'warp', opacity: 0.8 }),
    ],
    tiled: false,
    size: 512,
  }
  const body = buildTslBody(cfg)
  expect(body.split('const perlin3 = Fn').length - 1).toBe(1)
  const effect = evaluate(body)
  expect(effect(TSL.vec2(0.1, 0.9), TSL.float(1))).toBeDefined()
  expect(buildTslModule(cfg)).toContain("from 'three/tsl'")
})
