// Normalization scales applied by the display wrappers (not by the core
// algorithms, which return their natural ranges).
//
// Simplex scales were calibrated empirically over 3M random samples with ~10%
// headroom; display output is clamped to [0, 1].
//
// The Perlin scales preserve DISPLAY CONTRAST rather than hugging the bounds:
// the table gradients have length sqrt(2), so raw amplitude runs sqrt(2) above
// unit-gradient noise, and these scales match the standard deviation that
// sqrt(n/4)-normalized unit-gradient noise would have. Measured over 1.5M
// samples.
export const PERLIN2_NORM = 0.99 // raw sd 0.3055, absmax ~1.0 (never clips)
export const PERLIN3_NORM = 0.8166 // raw sd 0.2701, absmax ~1.0 (peaks reach 0.82)
// The Simplex scales carry the same sqrt(2) adjustment for the table
// gradients, again chosen for display contrast rather than the bounds. Both
// leave ~10% headroom.
export const SIMPLEX2_NORM = 63.67
export const SIMPLEX3_NORM = 69.32
export const SIMPLEX4_NORM = 25
export const SIMPLEX_VALUE_NORM = 14.5 // 2D and 3D absmax is (0.5^4) = 0.0625
export const SIMPLEX_VALUE4_NORM = 8.2 // torus path, 0.6 kernel radius
export const RIPPLE_NORM = 0.36
export const CRACKLE_NORM = 1.6 // unsigned display boost; rare peaks (~1.28 max) clamp
export const STARS_NORM = 1.4 // unsigned display boost; overlapping splats clamp

// Non-Euclidean cellular metrics, calibrated over 3M random samples. L1 reaches
// further than the Euclidean F1 it replaces and Linf falls short of it, so each
// gets its own scale; both are set so the 99.9th percentile lands at 1 and the
// mean near mid-grey. Rare peaks clamp.
export const MANHATTAN2_NORM = 0.78 // raw p99.9 1.27, max 1.66
export const MANHATTAN3_NORM = 0.67 // raw p99.9 1.49, max 1.87
export const CHEBYSHEV2_NORM = 1.15 // raw p99.9 0.87, max 0.99
export const CHEBYSHEV3_NORM = 1.24 // raw p99.9 0.81, max 0.95

// Gabor sums a handful of kernels, so its absolute maximum (~2.2) is far out in
// the tail of a distribution whose sd is only ~0.29 (2D) / ~0.24 (3D).
// Normalizing to the maximum would render it nearly flat grey, so these map
// three standard deviations to full scale instead and let the top 0.1% clamp —
// the same trade Ripple and Stars make.
export const GABOR2_NORM = 1.15
export const GABOR3_NORM = 1.35

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Format a number as a GLSL/WGSL float literal (always with a decimal point). */
export const fmt = (n: number): string => (Number.isInteger(n) ? `${n}.0` : `${n}`)
