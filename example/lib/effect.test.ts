import { describe, expect, test } from 'bun:test'

import { createEffect } from './effect'
import { defaultVariant, getNoise, NOISES } from './registry'

import type { Effect, LayerSpec } from './effect'
import type { NoiseDef } from './registry'

/** A layer over a registry variant's NoiseSource, at the noise's own scale. */
const layerOf = (noiseId: string, dim: 2 | 3, over: Partial<LayerSpec> = {}): LayerSpec => {
  const noise = getNoise(noiseId) as NoiseDef
  const variant = noise.variants.find(v => v.dim === dim) ?? defaultVariant(noise)
  return { noise: variant.source, scale: noise.scale, ...over }
}

test('a minimal spec applies sane defaults', () => {
  const effect = createEffect({ layers: [{ noise: defaultVariant(getNoise('perlin') as NoiseDef).source }] })
  const [layer] = effect.layers
  expect(layer?.noise.dim).toBe(3)
  expect(layer?.octaves).toBe(1)
  expect(layer?.style).toBe('basic')
  expect(layer?.scale).toBe(8)
  expect(layer?.blend).toBe('normal')
  expect(layer?.opacity).toBe(1)
})

test('sampling stays in [0, 1] and matches across calls', () => {
  const effect = createEffect({
    layers: [
      layerOf('perlin', 3, { octaves: 3 }),
      layerOf('worley', 3, { style: 'ridged', blend: 'multiply', opacity: 0.5 }),
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
    layers: [layerOf('simplex', 3, { octaves: 2 }), layerOf('stars', 3, { blend: 'screen' })],
  })
  expect(effect.glsl()).toContain('#version 300 es')
  expect(effect.wgsl()).toContain('@fragment fn fs')
  expect(effect.tsl()).toContain("from 'three/tsl'")
  expect(effect.tslBody()).not.toContain('import')
})

test('a backend whose spec was not provided throws, and only that backend', () => {
  const perlin = defaultVariant(getNoise('perlin') as NoiseDef)
  const cpuOnly = createEffect({ layers: [{ noise: { dim: 3, sample: perlin.source.sample } }] })
  expect(cpuOnly.sample(0.3, 0.7)).toBeGreaterThanOrEqual(0)
  expect(() => cpuOnly.glsl()).toThrow(/no GLSL spec/)
  expect(() => cpuOnly.wgsl()).toThrow(/no WGSL spec/)
  expect(() => cpuOnly.tslBody()).toThrow(/no TSL spec/)

  const wgslOnly = createEffect({ layers: [{ noise: { dim: 3, wgsl: perlin.source.wgsl } }] })
  expect(wgslOnly.wgsl()).toContain('@fragment fn fs')
  expect(() => wgslOnly.sample(0.3, 0.7)).toThrow(/no CPU sampler/)
})

test('tiled is only honoured when every layer can tile', () => {
  const tileable = createEffect({ layers: [layerOf('perlin', 3), layerOf('worley', 3)], tiled: true })
  expect(tileable.tileable).toBe(true)
  expect(tileable.tiled).toBe(true)

  // Simplex Loop spends its spare dimensions on the time circle and has no tileable path.
  const mixed = createEffect({ layers: [layerOf('perlin', 3), layerOf('simplex-loop', 3)], tiled: true })
  expect(mixed.tileable).toBe(false)
  expect(mixed.tiled).toBe(false)
})

test('tiled periods stay whole lattice cells', () => {
  const effect = createEffect({ layers: [layerOf('wave', 3, { scale: 1.5 })], tiled: true })
  expect(Number.isInteger(effect.layers[0]?.scale)).toBe(true)
})

test('a layer without a NoiseSource fails loudly', () => {
  expect(() => createEffect({ layers: [{} as LayerSpec] })).toThrow(/NoiseSource/)
  expect(() => createEffect({ layers: [] })).toThrow(/at least one layer/)
})

test('every registry variant can build an effect in all languages', () => {
  for (const noise of NOISES) {
    for (const variant of noise.variants) {
      const effect = createEffect({ layers: [{ noise: variant.source, scale: noise.scale }] })
      expect(effect.sample(0.42, 0.17, 0.5)).toBeGreaterThanOrEqual(0)
      expect(effect.glsl().length).toBeGreaterThan(0)
      expect(effect.wgsl().length).toBeGreaterThan(0)
      expect(effect.tsl().length).toBeGreaterThan(0)
    }
  }
})

test('drift translates the field over time, in the heading direction', () => {
  const still = createEffect({ layers: [layerOf('perlin', 2)] })
  const drifting = createEffect({ layers: [layerOf('perlin', 2, { speed: 1, angle: 0 })] })

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
  for (const scale of [4, 32]) {
    const still = createEffect({ layers: [layerOf('perlin', 2, { scale })] })
    const drifting = createEffect({ layers: [layerOf('perlin', 2, { scale, speed: 1, angle: 0 })] })
    expect(drifting.sample(0.31, 0.62, t)).toBeCloseTo(still.sample(0.31 - t, 0.62, 0), 10)
  }
})

test('angle 90 moves the pattern up the screen', () => {
  const still = createEffect({ layers: [layerOf('perlin', 2)] })
  const up = createEffect({ layers: [layerOf('perlin', 2, { speed: 1, angle: 90 })] })
  const t = 0.5
  // v points down, so moving up means sampling further down the field.
  expect(up.sample(0.31, 0.62, t)).toBeCloseTo(still.sample(0.31, 0.62 + t, 0), 10)
})

// Octaves at exactly doubled frequency share lattice points, and gradient
// noise is zero at every one of them — without per-octave decorrelation
// offsets, fBm is pinned to exact mid-grey on a visible grid. Perlin's scale
// is 8, so lattice corners sit at u,v = k/8.
test('octaves are decorrelated: fBm is not pinned to 0.5 at lattice corners', () => {
  const single = createEffect({ layers: [layerOf('perlin', 2)] })
  const fbm = createEffect({ layers: [layerOf('perlin', 2, { octaves: 6 })] })
  for (let i = 1; i < 8; i++) {
    for (let j = 1; j < 8; j++) {
      expect(single.sample(i / 8, j / 8)).toBe(0.5) // the basis really is zero there
      expect(fbm.sample(i / 8, j / 8)).not.toBe(0.5) // the fractal must not be
    }
  }
})

describe('steps', () => {
  test('defaults to 0 (smooth) and clamps to 2-32', () => {
    expect(createEffect({ layers: [layerOf('perlin', 3)] }).spec.steps).toBe(0)
    expect(createEffect({ layers: [layerOf('perlin', 3)], steps: 1 }).spec.steps).toBe(0)
    expect(createEffect({ layers: [layerOf('perlin', 3)], steps: 100 }).spec.steps).toBe(32)
  })

  test('stepSmoothing defaults to the crisp pixel ease and clamps to 0.01-1', () => {
    expect(createEffect({ layers: [layerOf('perlin', 3)] }).spec.stepSmoothing).toBe(0.03)
    expect(createEffect({ layers: [layerOf('perlin', 3)], stepSmoothing: 0.25 }).spec.stepSmoothing).toBe(0.25)
    expect(createEffect({ layers: [layerOf('perlin', 3)], stepSmoothing: 0 }).spec.stepSmoothing).toBe(0.01)
    expect(createEffect({ layers: [layerOf('perlin', 3)], stepSmoothing: 5 }).spec.stepSmoothing).toBe(1)
  })

  // A wider ease is what displaced geometry uses: the same bands, terraced
  // with beveled cliffs a vertex grid can resolve without sawtooth edges.
  test('a wider ease keeps the same levels but spends more samples in transition', () => {
    const crisp = createEffect({ layers: [layerOf('perlin', 2, { octaves: 4 })], steps: 4 })
    const beveled = createEffect({ layers: [layerOf('perlin', 2, { octaves: 4 })], steps: 4, stepSmoothing: 0.25 })
    let crispFlat = 0
    let beveledFlat = 0
    const onLattice = (q: number) => q === 0 || q === 1 / 3 || q === 2 / 3 || q === 1
    for (let i = 0; i < 2000; i++) {
      const u = (i * 0.7131) % 1
      const v = (i * 0.2917) % 1
      if (onLattice(crisp.sample(u, v))) crispFlat++
      if (onLattice(beveled.sample(u, v))) beveledFlat++
    }
    expect(crispFlat).toBeGreaterThan(beveledFlat)
    expect(beveledFlat).toBeGreaterThan(0)
  })

  // The band borders ease into the next level over the top STEP_SMOOTHING of
  // each band (hard steps alias; fwidth AA is fragment-only and the effect
  // also runs on the CPU and in the vertex stage), so flat levels cover the
  // rest of each band and the transitions stay monotone between neighbours.
  test('posterizes the smooth field into n levels with eased borders', () => {
    const smooth = createEffect({ layers: [layerOf('perlin', 2, { octaves: 4 })] })
    const stepped = createEffect({ layers: [layerOf('perlin', 2, { octaves: 4 })], steps: 4 })
    let flat = 0
    const total = 2000
    for (let i = 0; i < total; i++) {
      const u = (i * 0.7131) % 1
      const v = (i * 0.2917) % 1
      const q = stepped.sample(u, v)
      const s = smooth.sample(u, v)
      const band = Math.min(Math.floor(s * 4), 3)
      const frac = s * 4 - band
      if (frac < 0.97) {
        // Below the eased top of the band: exactly on the level lattice.
        expect(q).toBe(band / 3)
        flat++
      } else {
        // Inside the transition: between this level and the next.
        expect(q).toBeGreaterThanOrEqual(band / 3)
        expect(q).toBeLessThanOrEqual((band + 1) / 3)
      }
    }
    // The eased zone is a sliver of each band; nearly all samples sit on flat levels.
    expect(flat / total).toBeGreaterThan(0.9)
  })
})

// Rotated octaves are the classic fBm construction (iq's matrices, lacunarity
// 2.02): stronger decorrelation than the offsets — every lattice alignment is
// broken, not just the zero-pinning — at the price of tiling.
describe('rotate', () => {
  test('defaults off, is inert at one octave, and kills tiling past it', () => {
    expect(createEffect({ layers: [layerOf('perlin', 3)] }).spec.layers[0]?.rotate).toBe(false)
    const inert = createEffect({ layers: [layerOf('perlin', 3, { rotate: true })], tiled: true })
    expect(inert.tileable).toBe(true)
    const rotated = createEffect({ layers: [layerOf('perlin', 3, { octaves: 5, rotate: true })], tiled: true })
    expect(rotated.tileable).toBe(false)
    expect(rotated.tiled).toBe(false)
  })

  test('changes the field relative to the offset construction', () => {
    const offset = createEffect({ layers: [layerOf('perlin', 2, { octaves: 5 })] })
    const rotated = createEffect({ layers: [layerOf('perlin', 2, { octaves: 5, rotate: true })] })
    expect(rotated.sample(0.31, 0.62)).not.toBe(offset.sample(0.31, 0.62))
  })

  // Same guarantee the offsets give, achieved the stronger way. The origin
  // (uv 0,0) is excluded: it is a fixed point of any linear octave map.
  test('rotated fBm is not pinned to 0.5 at lattice corners', () => {
    const rotated = createEffect({ layers: [layerOf('perlin', 2, { octaves: 6, rotate: true })] })
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
  ] as const)('%s %s: 6 octaves keep the single-octave sd', (style, noiseId) => {
    const one = createEffect({ layers: [layerOf(noiseId, 2, { style })] })
    const six = createEffect({ layers: [layerOf(noiseId, 2, { style, octaves: 6 })] })
    const ratio = displaySd(six) / displaySd(one)
    expect(ratio).toBeGreaterThan(0.85)
    expect(ratio).toBeLessThan(1.15)
  })

  // The trade for that contrast: the rarest extremes may clamp, but only as
  // rarely as the calibrated display norms themselves allow (top ~0.1%).
  test('clipping stays rare', () => {
    const six = createEffect({ layers: [layerOf('perlin', 2, { octaves: 6 })] })
    let clipped = 0
    const N = 20000
    for (let i = 0; i < N; i++) {
      const v = six.sample((i * 0.7131) % 1, (i * 0.148137) % 1)
      if (v === 0 || v === 1) clipped++
    }
    expect(clipped / N).toBeLessThan(0.002)
  })
})

// The band display option: 1 inside one value interval, 0 outside, eased
// edges — the mask-preview counterpart of stepped rendering.
describe('band rendering', () => {
  test('isolates a single band: values stay in [0, 1] and both sides occur', () => {
    const effect = createEffect({ layers: [layerOf('perlin', 3)], band: { center: 0.5, width: 0.1 } })
    let inside = 0
    let outside = 0
    for (let i = 0; i < 4000; i++) {
      const v = effect.sample((i % 63) / 63, ((i * 13) % 61) / 61, 0.3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      if (v > 0.99) inside++
      if (v < 0.01) outside++
    }
    // A 10%-wide mid band over Perlin is sparse but not empty, and most of
    // the field is outside it.
    expect(inside).toBeGreaterThan(0)
    expect(outside).toBeGreaterThan(inside)
  })

  test('band and steps are mutually exclusive', () => {
    expect(() =>
      createEffect({ layers: [layerOf('perlin', 3)], steps: 4, band: { center: 0.5, width: 0.1 } }),
    ).toThrow()
  })

  test('every language emits the band pass', () => {
    const effect = createEffect({ layers: [layerOf('perlin', 3)], band: { center: 0.25, width: 0.04 } })
    // lo = 0.23; the eased rise ends at lo + BAND_SMOOTHING = 0.2375.
    expect(effect.glsl()).toContain('smoothstep(0.23, 0.2375')
    expect(effect.wgsl()).toContain('smoothstep(0.23, 0.2375')
    expect(effect.tslBody()).toContain('smoothstep(float(0.23), float(0.2375')
    expect(effect.spec.band).toEqual({ center: 0.25, width: 0.04 })
  })

  test('the smooth gradient never runs the band pass', () => {
    const effect = createEffect({ layers: [layerOf('perlin', 3)] })
    expect(effect.spec.band).toBeNull()
  })
})
