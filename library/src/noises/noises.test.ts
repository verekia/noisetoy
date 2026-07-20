import { describe, expect, test } from 'bun:test'

import { getNoise, NOISES } from '../registry'

import type { NoiseDef, NoiseVariant } from '../registry'

const variantOf = (noiseId: string, variantId: string): NoiseVariant => {
  const noise = getNoise(noiseId) as NoiseDef
  return noise.variants.find(v => v.id === variantId) as NoiseVariant
}

const mulberry32 = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe.each(NOISES.map(n => [n.name, n] as const))('%s', (_name, noise) => {
  describe.each(noise.variants.map(v => [v.label, v] as const))('%s', (_label, variant) => {
    test('is deterministic', () => {
      expect(variant.sample(1.234, 5.678, 9.1011)).toBe(variant.sample(1.234, 5.678, 9.1011))
    })

    test('stays in [0, 1] and is not constant', () => {
      const rand = mulberry32(42)
      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < 20000; i++) {
        const v = variant.sample(rand() * 100 - 20, rand() * 100 - 20, rand() * 100 - 20)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
        if (v < min) min = v
        if (v > max) max = v
      }
      expect(max - min).toBeGreaterThan(0.1)
    })

    const tileable = variant.sampleTileable
    if (tileable) {
      test('tileable variant stays in [0, 1] and wraps seamlessly', () => {
        const rand = mulberry32(7)
        const px = noise.scale
        const py = noise.scale
        for (let i = 0; i < 2000; i++) {
          const x = rand() * px
          const y = rand() * py
          const z = rand() * 10
          const base = tileable(x, y, z, px, py)
          expect(base).toBeGreaterThanOrEqual(0)
          expect(base).toBeLessThanOrEqual(1)
          expect(tileable(x + px, y, z, px, py)).toBeCloseTo(base, 10)
          expect(tileable(x, y + py, z, px, py)).toBeCloseTo(base, 10)
          expect(tileable(x - px, y - py, z, px, py)).toBeCloseTo(base, 10)
        }
      })

      if (noise.tileableStrategy === 'lattice-wrap') {
        test('tileable variant matches core away from the seam', () => {
          const rand = mulberry32(1337)
          const px = noise.scale
          const py = noise.scale
          for (let i = 0; i < 2000; i++) {
            const x = 1 + rand() * (px - 2.2)
            const y = 1 + rand() * (py - 2.2)
            const z = rand() * 10
            expect(tileable(x, y, z, px, py)).toBeCloseTo(variant.sample(x, y, z), 12)
          }
        })
      }
    } else {
      test('has no tileable code path', () => {
        expect(variant.sampleTileable).toBeNull()
        expect(variant.glslTileable).toBeNull()
        expect(variant.wgslTileable).toBeNull()
      })
    }

    test('shader specs are consistent across languages', () => {
      expect(variant.glsl.dim).toBe(variant.dim)
      expect(variant.wgsl.dim).toBe(variant.dim)
      expect(variant.glsl.expr).toContain('(p')
      expect(variant.wgsl.expr).toContain('(p')
      if (variant.sampleTileable) {
        expect(variant.glslTileable?.dim).toBe(variant.dim)
        expect(variant.wgslTileable?.dim).toBe(variant.dim)
        expect(variant.glslTileable?.expr).toContain('per')
        expect(variant.wgslTileable?.expr).toContain('per')
      } else {
        expect(variant.glslTileable).toBeNull()
        expect(variant.wgslTileable).toBeNull()
      }
    })
  })
})

// Flow and Simplex Loop treat the third input as a phase, not a depth: both are
// exactly periodic in z with period 1, which is the whole reason they exist and
// is not covered by the generic suite above.
describe.each([
  ['Flow', 'flow', 'flow-3d'],
  ['Simplex Loop', 'simplex-loop', 'simplex-loop-3d'],
] as const)('%s', (_name, noiseId, variantId) => {
  const variant = variantOf(noiseId, variantId)

  test('is exactly periodic in z with period 1', () => {
    const rand = mulberry32(99)
    for (let i = 0; i < 2000; i++) {
      const x = rand() * 40 - 20
      const y = rand() * 40 - 20
      const z = rand() * 4 - 2
      const base = variant.sample(x, y, z)
      expect(variant.sample(x, y, z + 1)).toBeCloseTo(base, 10)
      expect(variant.sample(x, y, z - 2)).toBeCloseTo(base, 10)
    }
  })

  // A field that merely repeats could be constant in z. It has to actually move.
  test('varies within a single period', () => {
    const rand = mulberry32(5)
    let moved = 0
    for (let i = 0; i < 500; i++) {
      const x = rand() * 40 - 20
      const y = rand() * 40 - 20
      if (Math.abs(variant.sample(x, y, 0) - variant.sample(x, y, 0.5)) > 0.05) moved++
    }
    expect(moved).toBeGreaterThan(250)
  })
})

// Flow's rotation rates are per corner. A single shared rate would rotate every
// gradient by pi at half phase, making the whole field the exact negative of
// itself — a breathing inversion rather than flow. With mixed rates the rate-1
// corners invert while the rate-2 corners come back round to identity, so only
// the points dominated by a rate-1 corner mirror: ~26% as implemented, against
// 100% for a shared rate. The threshold sits between those two regimes.
test('Flow is not a global inversion at half phase', () => {
  const variant = variantOf('flow', 'flow-3d')
  const rand = mulberry32(17)
  let inverted = 0
  for (let i = 0; i < 500; i++) {
    const x = rand() * 40 - 20
    const y = rand() * 40 - 20
    // Display maps the signed field through 0.5 + k*v, so an inversion of the
    // raw field shows up as values mirrored about 0.5.
    if (Math.abs(variant.sample(x, y, 0) + variant.sample(x, y, 0.5) - 1) < 0.02) inverted++
  }
  expect(inverted).toBeLessThan(250)
})

// White noise is defined by having no interpolation: one value per cell.
describe.each([
  ['2D', 'white-2d'],
  ['3D', 'white-3d'],
] as const)('White %s', (_label, variantId) => {
  const variant = variantOf('white', variantId)

  test('is constant within a lattice cell and generally differs across cells', () => {
    const rand = mulberry32(23)
    let differs = 0
    for (let i = 0; i < 2000; i++) {
      const ix = Math.floor(rand() * 200) - 100
      const iy = Math.floor(rand() * 200) - 100
      const iz = Math.floor(rand() * 200) - 100
      const at = (fx: number, fy: number) => variant.sample(ix + fx, iy + fy, iz + 0.5)
      expect(at(0.1, 0.1)).toBe(at(0.9, 0.9))
      expect(at(0.5, 0.2)).toBe(at(0.2, 0.5))
      if (at(0.5, 0.5) !== variant.sample(ix + 1.5, iy + 0.5, iz + 0.5)) differs++
    }
    expect(differs).toBeGreaterThan(1900)
  })
})
