// A static cost model for noise stacks, so a UI can tell you whether what you
// are building is cheap or expensive before you ship it.
//
// The score is a property of the ALGORITHM alone: which noises, how many
// octaves, how they blend. It deliberately says nothing about how the result is
// displayed. Sampling the same stack onto a flat quad, a displaced plane or a
// sphere evaluates the identical arithmetic; a given presentation may evaluate
// it a different NUMBER of times (shading a displaced surface needs extra
// samples for the normal), but that is a property of the renderer, not of the
// noise, and multiplying it in here would make the same stack score differently
// for reasons that have nothing to do with the algorithm. Units are per
// evaluation, so a caller who knows their own sample count can scale it.
//
// The numbers come from two INDEPENDENT estimates that are then blended.
//
// 1. MEASURED. Every variant rendered at 1024x1024 for 60 frames on both the
//    WebGL and WebGPU backends, at 1 octave and at 4 octaves. The cost of one
//    evaluation is the SLOPE between those points, (t4 - t1) / 3, averaged over
//    the backends. Taking the slope rather than the absolute time of a single
//    octave cancels the fixed cost of filling the framebuffer and the
//    single-octave fast path in the composers. Timings are reproducible to a
//    few percent, but no better — see the inversion noted below.
//
// 2. ANALYTICAL. Instruction counts read off the GLSL sources by hand and
//    weighted by relative GPU cost, in cost-analytic.json. Free of measurement
//    noise, but blind to what a particular GPU charges for a transcendental.
//
// Regressing one against the other over the 32 benchmarked variants gives
//     measured = 0.119 + 0.979 * analytical,  R^2 = 0.987
// which is a strong mutual validation: two methods sharing no inputs agree on
// 99% of the variance. The slope of ~1 says the instruction weights were about
// right. The intercept is the fixed per-evaluation overhead the op count cannot
// see — the fractal loop body, the call, the style shaping — worth about 0.12
// of a Perlin 3D evaluation.
//
// VARIANT_COST is the mean of the measured value and the value the regression
// predicts from the op count, renormalised so Perlin 3D = 1. Blending matters:
// value-3d MEASURED cheaper than value-2d (0.52 against 0.54), which cannot be
// true, since 3D value noise hashes eight lattice corners against four. Both
// are cheap enough that their timings are bound by something other than the
// noise. The op count knows better, and the blend restores a sane 1.28x ratio.
//
// WHAT THE MEASUREMENTS SETTLED
// - Octaves are linear. Perlin 3D went 0.558 ms at 2 octaves to 2.152 ms at 8,
//   a straight line with a near-zero intercept.
// - A layer costs the same as an octave: eight Perlin layers at different
//   scales measured 2.05 ms against 1.95 ms predicted by summing octaves.
// - Summing per-variant costs predicts whole stacks to within ~10% with no
//   fitted constant (an eight-noise stack: 3.27 ms predicted, 3.26 ms
//   measured), which is why this model is a plain sum.
// - `scale` costs nothing. It changes sampling frequency, not instruction count.
// - Blend modes are free to within noise, EXCEPT that a 'normal' blend at full
//   opacity discards everything beneath it and the compiler drops those layers.
//   Measured: Perlin under Worley/normal/100% cost 0.653 ms, Worley alone
//   0.649 ms. `estimateCost` models this.
//
// CAVEAT: measured on one machine (Apple Silicon, Chrome). Relative ordering is
// far more trustworthy than absolute values, and backends disagree on some
// noises — Worley 3D costs ~4x Perlin on WebGL but ~2x under TSL.
//
// PERLIN_SWAP. The UNIT IS FROZEN at one evaluation of the trig-gradient
// Perlin 3D, ~0.25 ms per megapixel on the reference GPU — the implementation
// the tier thresholds were calibrated against. The shipping Perlin (table
// gradients, folded hash) is 2.6x cheaper and costs 0.42 of that unit;
// re-anchoring the unit to it would multiply every other entry by ~2.4 and
// detach them from the timings they were derived from.
//
// Perlin, Simplex, Marble and Contour have no MEASURED_COST entry: they have
// not been benchmarked in their current form. Their VARIANT_COST figures are
// transferred estimates — a prior implementation's timing scaled by the
// op-count ratio and blended with the regression, the same transfer described
// below.

import { defaultVariant, getNoise, getVariant, NOISES } from './registry'

import type { LayerConfig } from './render/types'

/**
 * Cost of one evaluation of each variant, relative to Perlin 3D = 1. On the
 * reference machine one unit was ~0.25 ms per megapixel.
 */
/**
 * Raw benchmark slopes, before blending. Kept so the blend stays auditable
 * and so a recalibration can be diffed against what came before.
 */
export const MEASURED_COST: Record<string, number> = {
  'truchet-2d': 0.11,
  'simplex-value-2d': 0.28,
  'vortex-2d': 0.43,
  'value-3d': 0.52,
  'value-2d': 0.54,
  'wave-2d': 0.55,
  'simplex-value-3d': 0.57,
  'worley-2d': 0.6,
  'crackle-2d': 0.61,
  'foam-2d': 0.67,
  'mosaic-2d': 0.67,
  'stars-2d': 0.83,
  'vortex-3d': 1.05,
  'ripple-2d': 1.08,
  'wave-3d': 1.36,
  'worley-3d': 2.41,
  'crackle-3d': 2.48,
  'mosaic-3d': 2.55,
  'foam-3d': 2.63,
  'stars-3d': 3.23,
  'ripple-3d': 3.96,
}

/**
 * Variants that have never been through the GPU benchmark, so the measured half
 * of their score is inferred rather than observed — see the note on transferred
 * estimates below. Their ordering against benchmarked variants is the part to
 * distrust; a recalibration run should empty this set.
 */
export const PENDING_GPU_CALIBRATION: ReadonlySet<string> = new Set([
  // Perlin, Simplex and everything built on them have not been benchmarked in
  // their current form. See PERLIN_SWAP above.
  'simplex-2d',
  'simplex-3d',
  'perlin-2d',
  'perlin-3d',
  'marble-2d',
  'marble-3d',
  'contour-2d',
  'contour-3d',
  'white-2d',
  'white-3d',
  'flow-3d',
  'simplex-loop-3d',
  'worley-manhattan-2d',
  'worley-manhattan-3d',
  'worley-chebyshev-2d',
  'worley-chebyshev-3d',
  'gabor-2d',
  'gabor-3d',
])

// TRANSFERRED ESTIMATES. The blend above needs two independent numbers, and
// these ten variants have only one — the op count. Rather than drop the measured
// half, it is transferred from a benchmarked variant of the SAME code shape,
// scaled by the ratio of their op counts: Manhattan and Chebyshev from Worley,
// Gabor from Ripple, Flow from Perlin 2D, Simplex Loop from Simplex 3D. The
// transfer assumes only that two routines with the same loop structure and the
// same mix of hashes and transcendentals sit at the same point on the GPU's
// cost curve, which is exactly what the 0.987 regression says.
//
// White is the exception: its natural siblings are value-2d/3d, whose timings
// the comment above already flags as bound by something other than the noise
// (3D measured cheaper than 2D, which cannot be true). Transferring a number
// that is known to be noise-floor-bound would propagate the inversion — and did,
// in testing — so White is scored from the op count alone.

/**
 * Cost of one evaluation, relative to Perlin 3D = 1: the blend of the measured
 * and analytical estimates described above. On the reference machine one unit
 * was ~0.25 ms per megapixel.
 */
export const VARIANT_COST: Record<string, number> = {
  'white-2d': 0.15,
  'truchet-2d': 0.16,
  'white-3d': 0.16,
  'perlin-2d': 0.23,
  'contour-2d': 0.26,
  'simplex-value-2d': 0.26,
  'simplex-2d': 0.3,
  'value-2d': 0.39,
  'simplex-3d': 0.4,
  'perlin-3d': 0.42,
  'contour-3d': 0.45,
  'simplex-value-3d': 0.45,
  'vortex-2d': 0.45,
  'value-3d': 0.5,
  'flow-3d': 0.54,
  'wave-2d': 0.54,
  'worley-chebyshev-2d': 0.58,
  'worley-manhattan-2d': 0.58,
  'worley-2d': 0.59,
  'crackle-2d': 0.6,
  'marble-2d': 0.6,
  'foam-2d': 0.63,
  'mosaic-2d': 0.63,
  'simplex-loop-3d': 0.76,
  'stars-2d': 0.83,
  'ripple-2d': 0.99,
  'vortex-3d': 1.02,
  'marble-3d': 1.16,
  'wave-3d': 1.27,
  'gabor-2d': 1.78,
  'worley-chebyshev-3d': 2.31,
  'worley-manhattan-3d': 2.31,
  'worley-3d': 2.32,
  'crackle-3d': 2.37,
  'mosaic-3d': 2.4,
  'foam-3d': 2.46,
  'stars-3d': 3.12,
  'ripple-3d': 3.57,
  'gabor-3d': 6.95,
}

/** Milliseconds per cost unit per megapixel, on the reference GPU. */
export const MS_PER_UNIT_PER_MEGAPIXEL = 0.25

/** Fallback for a variant with no calibration entry, so a new noise still scores. */
const DEFAULT_COST = 1

export type CostTier = 'cheap' | 'moderate' | 'heavy'

/**
 * Upper bounds in cost units. 8 units is ~2 ms per megapixel on the reference
 * GPU, which leaves room for the rest of a frame even on much slower hardware;
 * past 25 units a full-screen effect starts to dominate the frame.
 */
export const TIER_LIMITS: { cheap: number; moderate: number } = { cheap: 8, moderate: 25 }

export const costTier = (units: number): CostTier =>
  units <= TIER_LIMITS.cheap ? 'cheap' : units <= TIER_LIMITS.moderate ? 'moderate' : 'heavy'

export const TIER_LABEL: Record<CostTier, string> = {
  cheap: 'Cheap',
  moderate: 'Moderate',
  heavy: 'Heavy',
}

/** Cost of one variant at a given octave count, in units. */
export const variantCost = (variantId: string, octaves = 1): number =>
  (VARIANT_COST[variantId] ?? DEFAULT_COST) * Math.max(1, octaves)

/** Cost of a noise's default-ish variant, for listing a noise before it is configured. */
export const noiseCost = (noiseId: string, variantId?: string, octaves = 1): number => {
  const noise = getNoise(noiseId)
  if (!noise) return DEFAULT_COST * Math.max(1, octaves)
  const variant = variantId ? getVariant(noise, variantId) : defaultVariant(noise)
  return variantCost(variant.id, octaves)
}

export type CostEstimate = {
  /** Total cost in units (Perlin 3D at one octave = 1). */
  units: number
  tier: CostTier
  /** Per-layer units, in stack order; 0 for layers the compiler will drop. */
  perLayer: number[]
  /** Indices of layers that cannot affect the result and cost nothing. */
  skipped: number[]
  /** Rough frame time on the reference GPU, for a full megapixel. */
  msPerMegapixel: number
}

/**
 * Estimates what a stack costs to evaluate once per pixel.
 *
 * Layers below an opaque 'normal' layer are reported as free: their value is
 * mathematically discarded, and shader compilers drop the dead code. 'warp' is
 * never dead, because it feeds the accumulated value back into the sampling
 * position of the layer above.
 */
export const estimateCost = (layers: LayerConfig[]): CostEstimate => {
  // Everything below the topmost fully-opaque 'normal' layer is unreachable.
  let firstLive = 0
  for (let i = layers.length - 1; i > 0; i--) {
    const l = layers[i] as LayerConfig
    if (l.blend === 'normal' && l.opacity >= 1) {
      firstLive = i
      break
    }
  }

  const perLayer = layers.map((l, i) => (i < firstLive ? 0 : variantCost(l.variant.id, l.octaves)))
  const units = perLayer.reduce((a, b) => a + b, 0)
  const skipped = layers.map((_, i) => i).filter(i => i < firstLive)

  return {
    units: Math.round(units * 100) / 100,
    tier: costTier(units),
    perLayer,
    skipped,
    msPerMegapixel: Math.round(units * MS_PER_UNIT_PER_MEGAPIXEL * 100) / 100,
  }
}

/** Every calibrated variant id, for tests that guard against uncalibrated noises. */
export const calibratedVariantIds = (): string[] =>
  NOISES.flatMap(n => n.variants.map(v => v.id)).filter(id => id in VARIANT_COST)
