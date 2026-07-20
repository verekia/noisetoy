// Perlin-derived noises: Marble, Contour.
//
// Provenance / disclosure:
// - Marble: the classic marble formula sin(x + turbulence) from Ken Perlin's
//   1985 paper "An Image Synthesizer" (never patented; Perlin's later patent
//   US 6,867,776 covered simplex noise and expired in 2022).
// - Contour: cos of a noise value ("sine of noise" iso-lines), shader
//   folklore; effectively marble without the coordinate term. No known patent.
//
// Both tile through the tileable Perlin code path (see
// tileable/perlin-derived-tileable.ts). MIT.

import { perlin2, perlin3 } from './perlin'

// These two scale with Perlin's amplitude, not with its pattern: they say how
// hard to bend and how many rings per unit of noise. Perlin's table gradients
// have length sqrt(2), so its raw amplitude runs sqrt(2) above unit-gradient
// noise; the 1/sqrt(2) factor compensates, keeping the constants tuned in
// unit-gradient terms.
const PERLIN_AMPLITUDE_RATIO = 0.7071067811865476

export const MARBLE_TURB = 1.5 * PERLIN_AMPLITUDE_RATIO
export const CONTOUR_K = 12 * PERLIN_AMPLITUDE_RATIO

const turb2 = (x: number, y: number): number =>
  Math.abs(perlin2(x, y)) + 0.5 * Math.abs(perlin2(x * 2, y * 2)) + 0.25 * Math.abs(perlin2(x * 4, y * 4))

const turb3 = (x: number, y: number, z: number): number =>
  Math.abs(perlin3(x, y, z)) +
  0.5 * Math.abs(perlin3(x * 2, y * 2, z * 2)) +
  0.25 * Math.abs(perlin3(x * 4, y * 4, z * 4))

/** Bands have period 2 lattice units, so the tile period must be even. */
export const marble2 = (x: number, y: number): number => Math.cos((x + MARBLE_TURB * turb2(x, y)) * Math.PI)

export const marble3 = (x: number, y: number, z: number): number =>
  Math.cos((x + MARBLE_TURB * turb3(x, y, z)) * Math.PI)

export const contour2 = (x: number, y: number): number => Math.cos(perlin2(x, y) * CONTOUR_K)

export const contour3 = (x: number, y: number, z: number): number => Math.cos(perlin3(x, y, z) * CONTOUR_K)
