import { describe, expect, test } from 'bun:test'

import { createEffect } from './effect'
import { getNoise, NOISES } from './registry'

import type { Effect } from './effect'

test('a minimal spec picks the 3D variant and sane defaults', () => {
  const effect = createEffect({ layers: [{ noise: 'perlin' }] })
  const [layer] = effect.spec.layers
  expect(layer?.variant).toBe('perlin-3d')
  expect(layer?.octaves).toBe(1)
  expect(layer?.style).toBe('basic')
  expect(layer?.scale).toBe(1)
  expect(layer?.blend).toBe('normal')
  expect(layer?.opacity).toBe(1)
})

test('dim selects a variant and scale multiplies the lattice', () => {
  const perlin = getNoise('perlin')
  const effect = createEffect({ layers: [{ noise: 'perlin', dim: 2, scale: 2 }] })
  expect(effect.spec.layers[0]?.variant).toBe('perlin-2d')
  expect(effect.layers[0]?.scale).toBe((perlin?.scale ?? 0) * 2)
})

test('sampling stays in [0, 1] and matches across calls', () => {
  const effect = createEffect({
    layers: [
      { noise: 'perlin', octaves: 3 },
      { noise: 'worley', style: 'ridged', blend: 'multiply', opacity: 0.5 },
    ],
  })
  for (let i = 0; i < 500; i++) {
    const u = i / 500
    const v = ((i * 7) % 500) / 500
    const a = effect.sample(u, v, 0.25)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
    expect(effect.sample(u, v, 0.25)).toBe(a)
  }
})

test('every language emits a program for the same stack', () => {
  const effect = createEffect({
    layers: [
      { noise: 'simplex', octaves: 2 },
      { noise: 'stars', blend: 'screen' },
    ],
  })
  expect(effect.glsl()).toContain('#version 300 es')
  expect(effect.wgsl()).toContain('@fragment fn fs')
  expect(effect.tsl()).toContain("from 'three/tsl'")
  expect(effect.tslBody()).not.toContain('import')
})

test('tiled is only honoured when every layer can tile', () => {
  const tileable = createEffect({ layers: [{ noise: 'perlin' }, { noise: 'worley' }], tiled: true })
  expect(tileable.tileable).toBe(true)
  expect(tileable.tiled).toBe(true)

  // Simplex Loop spends its spare dimensions on the time circle and has no tileable path.
  const mixed = createEffect({ layers: [{ noise: 'perlin' }, { noise: 'simplex-loop' }], tiled: true })
  expect(mixed.tileable).toBe(false)
  expect(mixed.tiled).toBe(false)
})

test('tiled periods stay whole lattice cells', () => {
  const effect = createEffect({ layers: [{ noise: 'wave', scale: 0.25 }], tiled: true })
  expect(Number.isInteger(effect.layers[0]?.scale)).toBe(true)
})

test('unknown noise ids fail loudly', () => {
  expect(() => createEffect({ layers: [{ noise: 'nope' }] })).toThrow(/Unknown noise/)
  expect(() => createEffect({ layers: [] })).toThrow(/at least one layer/)
})

test('toJSON round-trips through createEffect', () => {
  const original = createEffect({
    layers: [{ noise: 'ripple', dim: 2, octaves: 4, style: 'billow', scale: 0.5, blend: 'difference', opacity: 0.7 }],
  })
  const restored = createEffect(original.toJSON())
  expect(restored.toJSON()).toEqual(original.toJSON())
  expect(restored.sample(0.3, 0.6)).toBe(original.sample(0.3, 0.6))
})

test('every registered noise can build an effect in all languages', () => {
  for (const noise of NOISES) {
    for (const variant of noise.variants) {
      const effect = createEffect({ layers: [{ noise: noise.id, variant: variant.id }] })
      expect(effect.sample(0.42, 0.17, 0.5)).toBeGreaterThanOrEqual(0)
      expect(effect.glsl().length).toBeGreaterThan(0)
      expect(effect.wgsl().length).toBeGreaterThan(0)
      expect(effect.tsl().length).toBeGreaterThan(0)
    }
  }
})

test('drift translates the field over time, in the heading direction', () => {
  const still = createEffect({ layers: [{ noise: 'perlin', dim: 2 }] })
  const drifting = createEffect({ layers: [{ noise: 'perlin', dim: 2, speed: 1, angle: 0 }] })

  // Sampled away from lattice corners, where Perlin is exactly 0 either way.
  const u = 0.31
  const v = 0.62

  // A 2D layer without drift is static; with drift it changes over time.
  expect(still.sample(u, v, 0)).toBe(still.sample(u, v, 3))
  expect(drifting.sample(u, v, 0)).not.toBe(drifting.sample(u, v, 3))

  // Heading 0 moves the pattern right: what is at x now was at x - speed*t/scale.
  const scale = drifting.layers[0]?.scale ?? 1
  const t = 0.5
  expect(drifting.sample(u, v, t)).toBeCloseTo(still.sample(u - t / scale, v, 0), 10)
})

test('angle 90 moves the pattern up the screen', () => {
  const still = createEffect({ layers: [{ noise: 'perlin', dim: 2 }] })
  const up = createEffect({ layers: [{ noise: 'perlin', dim: 2, speed: 1, angle: 90 }] })
  const scale = up.layers[0]?.scale ?? 1
  const t = 0.5
  // v points down, so moving up means sampling further down the field.
  expect(up.sample(0.31, 0.62, t)).toBeCloseTo(still.sample(0.31, 0.62 + t / scale, 0), 10)
})

const meanDelta = (a: Effect, b: Effect) => {
  const N = 64
  let sum = 0
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++)
      sum += Math.abs(a.sample((x + 0.5) / N, (y + 0.5) / N) - b.sample((x + 0.5) / N, (y + 0.5) / N))
  }
  return sum / (N * N)
}

describe('gain', () => {
  const perlin = (octaves: number, gain?: number) =>
    createEffect({ layers: [{ noise: 'perlin', dim: 3, octaves, ...(gain === undefined ? {} : { gain }) }] })

  test('defaults to 0.5 and is clamped to 0.1-0.9', () => {
    expect(createEffect({ layers: [{ noise: 'perlin' }] }).spec.layers[0]?.gain).toBe(0.5)
    expect(createEffect({ layers: [{ noise: 'perlin', gain: 5 }] }).spec.layers[0]?.gain).toBe(0.9)
    expect(createEffect({ layers: [{ noise: 'perlin', gain: 0 }] }).spec.layers[0]?.gain).toBe(0.1)
  })

  test('is irrelevant at one octave', () => {
    expect(meanDelta(perlin(1, 0.3), perlin(1, 0.8))).toBe(0)
  })

  // The reason gain exists: at 0.5 the octaves past ~5 fall below one 8-bit
  // level, so raising the octave count stops changing anything visible.
  test('rescues the octaves that vanish at 0.5', () => {
    const faint = meanDelta(perlin(5, 0.5), perlin(10, 0.5))
    const strong = meanDelta(perlin(5, 0.8), perlin(10, 0.8))
    expect(faint * 255).toBeLessThan(1)
    expect(strong).toBeGreaterThan(faint * 8)
  })

  test('reaches every backend', () => {
    for (const src of [perlin(4, 0.8).glsl(), perlin(4, 0.8).wgsl(), perlin(4, 0.8).tsl()]) {
      expect(src).toContain('0.8')
      expect(src).not.toContain('amp *= 0.5')
    }
  })
})
