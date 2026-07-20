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

  // Speed is screen-relative: heading 0 at speed 1 moves the pattern right by
  // a full canvas per second, regardless of the layer scale.
  const t = 0.5
  expect(drifting.sample(u, v, t)).toBeCloseTo(still.sample(u - t, v, 0), 10)
})

test('the visible drift speed is the same at any scale', () => {
  const t = 0.5
  for (const scale of [0.5, 4]) {
    const still = createEffect({ layers: [{ noise: 'perlin', dim: 2, scale }] })
    const drifting = createEffect({ layers: [{ noise: 'perlin', dim: 2, scale, speed: 1, angle: 0 }] })
    expect(drifting.sample(0.31, 0.62, t)).toBeCloseTo(still.sample(0.31 - t, 0.62, 0), 10)
  }
})

test('angle 90 moves the pattern up the screen', () => {
  const still = createEffect({ layers: [{ noise: 'perlin', dim: 2 }] })
  const up = createEffect({ layers: [{ noise: 'perlin', dim: 2, speed: 1, angle: 90 }] })
  const t = 0.5
  // v points down, so moving up means sampling further down the field.
  expect(up.sample(0.31, 0.62, t)).toBeCloseTo(still.sample(0.31, 0.62 + t, 0), 10)
})

// Octaves at exactly doubled frequency share lattice points, and gradient
// noise is zero at every one of them — without per-octave decorrelation
// offsets, fBm is pinned to exact mid-grey on a visible grid. Perlin's scale
// is 8, so lattice corners sit at u,v = k/8.
test('octaves are decorrelated: fBm is not pinned to 0.5 at lattice corners', () => {
  const single = createEffect({ layers: [{ noise: 'perlin', dim: 2 }] })
  const fbm = createEffect({ layers: [{ noise: 'perlin', dim: 2, octaves: 6 }] })
  for (let i = 1; i < 8; i++) {
    for (let j = 1; j < 8; j++) {
      expect(single.sample(i / 8, j / 8)).toBe(0.5) // the basis really is zero there
      expect(fbm.sample(i / 8, j / 8)).not.toBe(0.5) // the fractal must not be
    }
  }
})

// Rotated octaves are the classic fBm construction (iq's matrices, lacunarity
// 2.02): stronger decorrelation than the offsets — every lattice alignment is
// broken, not just the zero-pinning — at the price of tiling.
describe('rotate', () => {
  test('defaults off, is inert at one octave, and kills tiling past it', () => {
    expect(createEffect({ layers: [{ noise: 'perlin' }] }).spec.layers[0]?.rotate).toBe(false)
    const inert = createEffect({ layers: [{ noise: 'perlin', rotate: true }], tiled: true })
    expect(inert.tileable).toBe(true)
    const rotated = createEffect({ layers: [{ noise: 'perlin', octaves: 5, rotate: true }], tiled: true })
    expect(rotated.tileable).toBe(false)
    expect(rotated.tiled).toBe(false)
  })

  test('changes the field relative to the offset construction', () => {
    const offset = createEffect({ layers: [{ noise: 'perlin', dim: 2, octaves: 5 }] })
    const rotated = createEffect({ layers: [{ noise: 'perlin', dim: 2, octaves: 5, rotate: true }] })
    expect(rotated.sample(0.31, 0.62)).not.toBe(offset.sample(0.31, 0.62))
  })

  // Same guarantee the offsets give, achieved the stronger way. The origin
  // (uv 0,0) is excluded: it is a fixed point of any linear octave map.
  test('rotated fBm is not pinned to 0.5 at lattice corners', () => {
    const rotated = createEffect({ layers: [{ noise: 'perlin', dim: 2, octaves: 6, rotate: true }] })
    for (let i = 1; i < 8; i++) {
      for (let j = 1; j < 8; j++) {
        expect(rotated.sample(i / 8, j / 8)).not.toBe(0.5)
      }
    }
  })
})

const displaySd = (e: Effect) => {
  const N = 128
  let sum = 0
  let sumSq = 0
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = e.sample((x + 0.5) / N, (y + 0.5) / N)
      sum += v
      sumSq += v * v
    }
  }
  const mean = sum / (N * N)
  return Math.sqrt(sumSq / (N * N) - mean * mean)
}

// The point of the variance-preserving normalization: raising the octave
// count adds detail without washing the layer toward mid-grey, so a 6-octave
// stack has the same display contrast as its single-octave basis. (The
// amplitude-sum alternative can never clip, but drops a 6-octave Perlin to
// ~60% of the basis contrast and turns the octave knob into a contrast knob.)
describe('octave normalization preserves contrast', () => {
  test.each([
    ['basic', 'perlin'],
    ['basic', 'simplex'],
  ] as const)('%s %s: 6 octaves keep the single-octave sd', (style, noise) => {
    const one = createEffect({ layers: [{ noise, dim: 2, style }] })
    const six = createEffect({ layers: [{ noise, dim: 2, style, octaves: 6 }] })
    const ratio = displaySd(six) / displaySd(one)
    expect(ratio).toBeGreaterThan(0.85)
    expect(ratio).toBeLessThan(1.15)
  })

  // The trade for that contrast: the rarest extremes may clamp, but only as
  // rarely as the calibrated display norms themselves allow (top ~0.1%).
  test('clipping stays rare', () => {
    const six = createEffect({ layers: [{ noise: 'perlin', dim: 2, octaves: 6 }] })
    let clipped = 0
    const N = 20000
    for (let i = 0; i < N; i++) {
      const v = six.sample((i * 0.7131) % 1, (i * 0.148137) % 1)
      if (v === 0 || v === 1) clipped++
    }
    expect(clipped / N).toBeLessThan(0.002)
  })
})
