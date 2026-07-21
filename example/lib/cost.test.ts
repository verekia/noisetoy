import { describe, expect, test } from 'bun:test'

import {
  costTier,
  estimateCost,
  MEASURED_COST,
  PENDING_GPU_CALIBRATION,
  TIER_LIMITS,
  VARIANT_COST,
  variantCost,
} from './cost'
import ANALYTIC from './cost-analytic.json'
import { NOISES } from './registry'

import type { CostLayer } from './cost'

describe('cost calibration', () => {
  test('every variant is calibrated', () => {
    const uncalibrated = NOISES.flatMap(n => n.variants.map(v => v.id)).filter(id => !(id in VARIANT_COST))
    expect(uncalibrated).toEqual([])
  })

  test('no calibration entry outlives its variant', () => {
    const live = new Set(NOISES.flatMap(n => n.variants.map(v => v.id)))
    expect(Object.keys(VARIANT_COST).filter(id => !live.has(id))).toEqual([])
  })

  // A 3D variant always does strictly more work than its 2D counterpart (eight
  // lattice corners against four, twenty-seven cells against nine), so it can
  // never be cheaper. The raw benchmark alone breaks this for value (3D
  // measured 0.52 against 2D's 0.54, inside the noise floor); blending with
  // the op count restores it, so the invariant holds strictly and guards the
  // blend.
  test('every 3D variant costs more than its 2D counterpart', () => {
    for (const noise of NOISES) {
      const d2 = noise.variants.find(v => v.dim === 2)
      const d3 = noise.variants.find(v => v.dim === 3)
      if (!d2 || !d3) continue
      expect(variantCost(d3.id)).toBeGreaterThan(variantCost(d2.id))
    }
  })

  // The blend is only meaningful if the two estimates agree; if a future
  // recalibration diverges wildly from the op count, that is a bug in one of
  // them and this catches it. Driven from MEASURED_COST rather than
  // VARIANT_COST, since only benchmarked variants have a raw number to compare
  // against.
  test('blended costs stay close to the raw measurements', () => {
    for (const [id, raw] of Object.entries(MEASURED_COST)) {
      const blended = VARIANT_COST[id] as number
      expect(blended).toBeDefined()
      expect(Math.abs(blended - raw)).toBeLessThan(Math.max(0.3, raw * 0.35))
    }
  })

  // Every variant is either benchmarked or explicitly declared as awaiting a
  // benchmark. Without this, a new noise could silently ship on an op count
  // alone and nobody would know which half of its score was real.
  test('every variant is either measured or declared pending', () => {
    const undeclared = NOISES.flatMap(n => n.variants.map(v => v.id)).filter(
      id => !(id in MEASURED_COST) && !PENDING_GPU_CALIBRATION.has(id),
    )
    expect(undeclared).toEqual([])
  })

  test('no pending entry outlives its variant, or lingers after being measured', () => {
    const live = new Set(NOISES.flatMap(n => n.variants.map(v => v.id)))
    for (const id of PENDING_GPU_CALIBRATION) {
      expect(live.has(id)).toBe(true)
      expect(MEASURED_COST[id]).toBeUndefined()
    }
  })

  test('the analytical op counts cover every variant', () => {
    const counted = Object.keys(ANALYTIC.variants)
    const live = NOISES.flatMap(n => n.variants.map(v => v.id))
    expect(live.filter(id => !counted.includes(id))).toEqual([])
  })
})

describe('estimateCost', () => {
  const units = (layers: CostLayer[]) => estimateCost(layers).units

  // The unit is one evaluation of the trig-gradient Perlin 3D and stays frozen
  // there: re-anchoring it to the shipping, 2.6x cheaper Perlin would detach
  // every other entry from the timings it came from. So Perlin 3D does not
  // cost 1.
  test('Perlin 3D costs a fraction of the frozen unit', () => {
    expect(units([{ variantId: 'perlin-3d' }])).toBe(0.42)
  })

  test('the frozen unit still means what the tier thresholds were calibrated against', () => {
    // Ripple 3D is benchmarked directly in its shipping form, so it anchors
    // the scale: if this number drifts, the scale has shifted under the
    // thresholds.
    expect(variantCost('ripple-3d')).toBe(3.57)
  })

  // The measured relationship: an octave and a layer cost the same.
  test('octaves scale linearly', () => {
    const one = units([{ variantId: 'perlin-3d' }])
    const six = units([{ variantId: 'perlin-3d', octaves: 6 }])
    expect(six).toBeCloseTo(one * 6, 5)
  })

  test('a layer costs the same as an octave', () => {
    const octaves = units([{ variantId: 'perlin-3d', octaves: 4 }])
    const layers = units(Array.from({ length: 4 }, () => ({ variantId: 'perlin-3d', blend: 'multiply' as const })))
    expect(layers).toBeCloseTo(octaves, 5)
  })

  // An opaque 'normal' layer discards everything under it, and the shader
  // compiler drops the dead code — measured on both GPU backends.
  test('layers under an opaque normal blend are free', () => {
    const e = estimateCost([
      { variantId: 'ripple-3d', octaves: 6 },
      { variantId: 'perlin-3d', blend: 'normal', opacity: 1 },
    ])
    expect(e.skipped).toEqual([0])
    expect(e.units).toBe(variantCost('perlin-3d'))
  })

  test('a partly transparent normal blend keeps the layers below', () => {
    const e = estimateCost([{ variantId: 'perlin-3d' }, { variantId: 'worley-3d', blend: 'normal', opacity: 0.5 }])
    expect(e.skipped).toEqual([])
  })

  test('warp never kills the layer below, since it consumes the accumulator', () => {
    const e = estimateCost([{ variantId: 'perlin-3d' }, { variantId: 'worley-3d', blend: 'warp', opacity: 1 }])
    expect(e.skipped).toEqual([])
  })

  test('tiers follow the thresholds', () => {
    expect(costTier(TIER_LIMITS.cheap)).toBe('cheap')
    expect(costTier(TIER_LIMITS.cheap + 0.01)).toBe('moderate')
    expect(costTier(TIER_LIMITS.moderate)).toBe('moderate')
    expect(costTier(TIER_LIMITS.moderate + 0.01)).toBe('heavy')
  })

  test('a plausible heavy stack lands in the heavy tier', () => {
    const e = estimateCost([
      { variantId: 'ripple-3d', octaves: 6 },
      { variantId: 'worley-3d', octaves: 4, blend: 'multiply' },
    ])
    expect(e.tier).toBe('heavy')
    expect(e.units).toBeCloseTo(3.57 * 6 + 2.32 * 4, 2)
  })

  test('a single cheap 2D noise is cheap', () => {
    expect(estimateCost([{ variantId: 'truchet-2d' }]).tier).toBe('cheap')
  })
})
