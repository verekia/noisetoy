// Tileable Worley noise. Same search as worley.ts, but the cell coordinates
// used for hashing feature points are wrapped modulo an integer period (in x
// and y), so neighbor cells beyond the seam reuse the wrapped cells' feature
// points. Distances stay geometric (unwrapped).
// This wrapping is deliberately kept out of the core implementation.

import { hash2, hash3, hashU32, imod, to01 } from '../common.js'

export const worley2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const ox = to01(h)
      const oy = to01(hashU32(h))
      const vx = dx + ox - fx
      const vy = dy + oy - fy
      const d = vx * vx + vy * vy
      if (d < f1) f1 = d
    }
  }
  return Math.sqrt(f1)
}

export const worley3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let f1 = 1e9
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const ox = to01(h)
        const oy = to01(h2)
        const oz = to01(hashU32(h2))
        const vx = dx + ox - fx
        const vy = dy + oy - fy
        const vz = dz + oz - fz
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) f1 = d
      }
    }
  }
  return Math.sqrt(f1)
}

/** Worley 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const worley2dCanonicalTileable = worley2Tileable

/** Worley 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const worley3dCanonicalTileable = worley3Tileable
