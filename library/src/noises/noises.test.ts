import { describe, expect, test } from 'bun:test'

import { ALL_VARIANTS, clampedSample, clampedSampleTileable } from '../testing/all-variants.js'

import type { VariantEntry } from '../testing/all-variants.js'

const entry = (id: string): VariantEntry => {
  const e = ALL_VARIANTS.find(v => v.id === id)
  if (!e) throw new Error(`missing variant ${id}`)
  return e
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

describe.each(ALL_VARIANTS.map(e => [e.id, e] as const))('%s', (_id, e) => {
  const sample = clampedSample(e)
  const tileable = clampedSampleTileable(e)

  test('is deterministic', () => {
    expect(sample(1.234, 5.678, 9.1011)).toBe(sample(1.234, 5.678, 9.1011))
  })

  test('stays in [0, 1] and is not constant', () => {
    const rand = mulberry32(42)
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < 20000; i++) {
      const v = sample(rand() * 100 - 20, rand() * 100 - 20, rand() * 100 - 20)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      if (v < min) min = v
      if (v > max) max = v
    }
    expect(max - min).toBeGreaterThan(0.1)
  })

  if (tileable) {
    test('tileable sampler stays in [0, 1] and wraps seamlessly', () => {
      const rand = mulberry32(7)
      const px = e.scale
      const py = e.scale
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

    if (e.tileableStrategy === 'lattice-wrap') {
      test('tileable sampler matches core away from the seam', () => {
        const rand = mulberry32(1337)
        const px = e.scale
        const py = e.scale
        for (let i = 0; i < 2000; i++) {
          const x = 1 + rand() * (px - 2.2)
          const y = 1 + rand() * (py - 2.2)
          const z = rand() * 10
          expect(tileable(x, y, z, px, py)).toBeCloseTo(sample(x, y, z), 12)
        }
      })
    }
  } else {
    test('has no tileable code path in any language', () => {
      expect(e.source.sampleTileable).toBeUndefined()
      expect(e.source.glslTileable).toBeUndefined()
      expect(e.source.wgslTileable).toBeUndefined()
      expect(e.source.tslTileable).toBeUndefined()
    })
  }

  test('shader specs are consistent across languages', () => {
    const s = e.source
    for (const spec of [s.glsl, s.wgsl, s.tsl]) {
      expect(spec).toBeDefined()
      expect(spec?.dim).toBe(s.dim)
      expect(spec?.expr).toContain('(p')
      expect(spec?.deps.length).toBeGreaterThan(0)
    }
    if (s.sampleTileable) {
      for (const spec of [s.glslTileable, s.wgslTileable, s.tslTileable]) {
        expect(spec?.dim).toBe(s.dim)
        expect(spec?.expr).toContain('per')
      }
    }
  })
})

// A Fast variant implements the same noise as its Canonical counterpart: the
// field is a different draw, but its display statistics must line up.
describe('fast variants keep the canonical display statistics', () => {
  const fastEntries = ALL_VARIANTS.filter(e => e.id.endsWith('Fast'))
  test.each(fastEntries.map(e => [e.id, e] as const))('%s', (id, e) => {
    const canonical = entry(id.replace(/Fast$/, 'Canonical'))
    const stats = (s: (x: number, y: number, z: number) => number) => {
      const rand = mulberry32(1234)
      let sum = 0
      let sumSq = 0
      const n = 20000
      for (let i = 0; i < n; i++) {
        const v = s(rand() * 64 - 16, rand() * 64 - 16, rand() * 64 - 16)
        sum += v
        sumSq += v * v
      }
      const mean = sum / n
      return { mean, sd: Math.sqrt(sumSq / n - mean * mean) }
    }
    const a = stats(clampedSample(e))
    const b = stats(clampedSample(canonical))
    expect(Math.abs(a.mean - b.mean)).toBeLessThan(0.02)
    expect(Math.abs(a.sd - b.sd)).toBeLessThan(0.03)
  })
})

// Flow and Simplex Loop treat the third input as a phase, not a depth: both are
// exactly periodic in z with period 1, which is the whole reason they exist and
// is not covered by the generic suite above.
describe.each([
  ['Flow', 'flow3dCanonical'],
  ['Simplex Loop', 'simplexLoop3dCanonical'],
  ['Flow (fast)', 'flow3dFast'],
] as const)('%s', (_name, id) => {
  const sample = clampedSample(entry(id))

  test('is exactly periodic in z with period 1', () => {
    const rand = mulberry32(99)
    for (let i = 0; i < 2000; i++) {
      const x = rand() * 40 - 20
      const y = rand() * 40 - 20
      const z = rand() * 4 - 2
      const base = sample(x, y, z)
      expect(sample(x, y, z + 1)).toBeCloseTo(base, 10)
      expect(sample(x, y, z - 2)).toBeCloseTo(base, 10)
    }
  })

  // A field that merely repeats could be constant in z. It has to actually move.
  test('varies within a single period', () => {
    const rand = mulberry32(5)
    let moved = 0
    for (let i = 0; i < 500; i++) {
      const x = rand() * 40 - 20
      const y = rand() * 40 - 20
      if (Math.abs(sample(x, y, 0) - sample(x, y, 0.5)) > 0.05) moved++
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
  const sample = clampedSample(entry('flow3dCanonical'))
  const rand = mulberry32(17)
  let inverted = 0
  for (let i = 0; i < 500; i++) {
    const x = rand() * 40 - 20
    const y = rand() * 40 - 20
    // Display maps the signed field through 0.5 + k*v, so an inversion of the
    // raw field shows up as values mirrored about 0.5.
    if (Math.abs(sample(x, y, 0) + sample(x, y, 0.5) - 1) < 0.02) inverted++
  }
  expect(inverted).toBeLessThan(250)
})

// White noise is defined by having no interpolation: one value per cell.
describe.each([
  ['2D', 'white2dCanonical'],
  ['3D', 'white3dCanonical'],
] as const)('White %s', (_label, id) => {
  const sample = clampedSample(entry(id))

  test('is constant within a lattice cell and generally differs across cells', () => {
    const rand = mulberry32(23)
    let differs = 0
    for (let i = 0; i < 2000; i++) {
      const ix = Math.floor(rand() * 200) - 100
      const iy = Math.floor(rand() * 200) - 100
      const iz = Math.floor(rand() * 200) - 100
      const at = (fx: number, fy: number) => sample(ix + fx, iy + fy, iz + 0.5)
      expect(at(0.1, 0.1)).toBe(at(0.9, 0.9))
      expect(at(0.5, 0.2)).toBe(at(0.2, 0.5))
      if (at(0.5, 0.5) !== sample(ix + 1.5, iy + 0.5, iz + 0.5)) differs++
    }
    expect(differs).toBeGreaterThan(1900)
  })
})

// The fast tileable Perlin bakes its period at 8 cells instead of taking it
// as a parameter — the seam guarantee still has to hold.
describe.each([
  ['2D', 'perlin2dFastTileable'],
  ['3D', 'perlin3dFastTileable'],
] as const)('Perlin fast tileable %s', (_label, id) => {
  const sample = clampedSample(entry(id))

  test('wraps at the baked 8-cell period in x and y', () => {
    const rand = mulberry32(31)
    for (let i = 0; i < 2000; i++) {
      const x = rand() * 8
      const y = rand() * 8
      const z = rand() * 10
      const base = sample(x, y, z)
      expect(sample(x + 8, y, z)).toBeCloseTo(base, 10)
      expect(sample(x, y + 8, z)).toBeCloseTo(base, 10)
    }
  })
})
