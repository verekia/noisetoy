// Truchet noise (2D only) — ring bands around random Truchet arc tiles.
//
// Each cell draws two quarter-circle arcs (radius 0.5) centered at opposite
// corners, mirrored by a hash bit; both orientations pass through all four
// edge midpoints, so arcs connect into meandering pipes across cells. The
// displayed value is cos of the distance to the nearest arc, giving
// concentric bands that follow the pipes.
//
// Provenance / disclosure: Truchet tiles date to Sebastien Truchet (1704) and
// the arc variant to Cyril Stanley Smith (1987) — long in the public domain.
// Arc-distance shading of Truchet tilings is shader-community folklore (no
// known patent); this is an original implementation on this repo's hash. MIT.

import { hash2 } from './common.js'

const TAU = 6.283185307179586

/** Ring bands per unit of arc distance. */
export const TRUCHET_RINGS = 3

export const truchet2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  const fy = y - iy
  if ((hash2(ix, iy) & 1) === 1) fx = 1 - fx
  const d1 = Math.abs(Math.sqrt(fx * fx + fy * fy) - 0.5)
  const gx = fx - 1
  const gy = fy - 1
  const d2 = Math.abs(Math.sqrt(gx * gx + gy * gy) - 0.5)
  const d = Math.min(d1, d2)
  return Math.cos(d * TAU * TRUCHET_RINGS)
}

/** Truchet 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const truchet2dCanonical = (x: number, y: number): number => 0.5 + 0.5 * truchet2(x, y)
