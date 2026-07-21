// Tileable Marble / Contour: same formulas as perlin-derived.ts but every
// Perlin evaluation goes through the tileable (lattice-wrapped) Perlin, with
// octave periods scaled by frequency. Marble's band term cos(x * pi) has
// period 2, so the tile period must be even (this repo uses 8).
// Kept out of the core implementation.

import { CONTOUR_K, MARBLE_TURB } from '../perlin-derived.js'
import { perlin2Tileable, perlin3Tileable } from './perlin-tileable.js'

const turb2T = (x: number, y: number, px: number, py: number): number =>
  Math.abs(perlin2Tileable(x, y, px, py)) +
  0.5 * Math.abs(perlin2Tileable(x * 2, y * 2, px * 2, py * 2)) +
  0.25 * Math.abs(perlin2Tileable(x * 4, y * 4, px * 4, py * 4))

const turb3T = (x: number, y: number, z: number, px: number, py: number): number =>
  Math.abs(perlin3Tileable(x, y, z, px, py)) +
  0.5 * Math.abs(perlin3Tileable(x * 2, y * 2, z * 2, px * 2, py * 2)) +
  0.25 * Math.abs(perlin3Tileable(x * 4, y * 4, z * 4, px * 4, py * 4))

export const marble2Tileable = (x: number, y: number, px: number, py: number): number =>
  Math.cos((x + MARBLE_TURB * turb2T(x, y, px, py)) * Math.PI)

export const marble3Tileable = (x: number, y: number, z: number, px: number, py: number): number =>
  Math.cos((x + MARBLE_TURB * turb3T(x, y, z, px, py)) * Math.PI)

export const contour2Tileable = (x: number, y: number, px: number, py: number): number =>
  Math.cos(perlin2Tileable(x, y, px, py) * CONTOUR_K)

export const contour3Tileable = (x: number, y: number, z: number, px: number, py: number): number =>
  Math.cos(perlin3Tileable(x, y, z, px, py) * CONTOUR_K)

/** Marble 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const marble2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * marble2Tileable(x, y, periodX, periodY)

/** Marble 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const marble3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * marble3Tileable(x, y, z, periodX, periodY)

/** Contour 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const contour2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * contour2Tileable(x, y, periodX, periodY)

/** Contour 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const contour3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * contour3Tileable(x, y, z, periodX, periodY)
