// Tileable ripple noise. Same wave-source sum as ripple.ts, but the cell
// coordinates used to hash source positions and phases are wrapped modulo the
// period in x/y (Worley-style), so sources beyond the seam reuse the wrapped
// cells' sources. Distances stay geometric (unwrapped).
// This wrapping is deliberately kept out of the core implementation.

import { hash2, hash3, hashU32, imod, to01 } from '../common.js'
import { RIPPLE_NORM } from '../normalization.js'
import { RIPPLE_FREQ, RIPPLE_RANGE } from '../ripple.js'

const TAU = 6.283185307179586

export const ripple2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const h2 = hashU32(h)
      const ox = to01(h)
      const oy = to01(h2)
      const ph = to01(hashU32(h2)) * TAU
      const vx = dx + ox - fx
      const vy = dy + oy - fy
      const d = Math.sqrt(vx * vx + vy * vy)
      const w = Math.max(0, 1 - d / RIPPLE_RANGE)
      sum += w * w * Math.cos(d * RIPPLE_FREQ - ph)
    }
  }
  return sum
}

export const ripple3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let sum = 0
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const h3 = hashU32(h2)
        const ox = to01(h)
        const oy = to01(h2)
        const oz = to01(h3)
        const ph = to01(hashU32(h3)) * TAU
        const vx = dx + ox - fx
        const vy = dy + oy - fy
        const vz = dz + oz - fz
        const d = Math.sqrt(vx * vx + vy * vy + vz * vz)
        const w = Math.max(0, 1 - d / RIPPLE_RANGE)
        sum += w * w * Math.cos(d * RIPPLE_FREQ - ph)
      }
    }
  }
  return sum
}

/** Ripple 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const ripple2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * RIPPLE_NORM * ripple2Tileable(x, y, periodX, periodY)

/** Ripple 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const ripple3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * RIPPLE_NORM * ripple3Tileable(x, y, z, periodX, periodY)
