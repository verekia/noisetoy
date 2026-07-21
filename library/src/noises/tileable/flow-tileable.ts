// Tileable flow noise. Lattice coordinates are wrapped modulo an integer
// period in x and y before hashing; the rotation phase (z) is untouched, so
// the tile stays seamless at every phase.
// This wrapping is deliberately kept out of the core implementation.

import { fade, hash2, imod, lerp } from '../common.js'
import { rotGradDot2 } from '../flow.js'
import { PERLIN2_NORM } from '../normalization.js'

const TAU = 6.283185307179586

export const flow3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const ph = z * TAU
  const x0 = imod(ix, px)
  const x1 = imod(ix + 1, px)
  const y0 = imod(iy, py)
  const y1 = imod(iy + 1, py)
  const n00 = rotGradDot2(hash2(x0, y0), ph, fx, fy)
  const n10 = rotGradDot2(hash2(x1, y0), ph, fx - 1, fy)
  const n01 = rotGradDot2(hash2(x0, y1), ph, fx, fy - 1)
  const n11 = rotGradDot2(hash2(x1, y1), ph, fx - 1, fy - 1)
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}

/** Flow 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const flow3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * PERLIN2_NORM * flow3Tileable(x, y, z, periodX, periodY)
