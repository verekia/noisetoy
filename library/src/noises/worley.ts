// Worley (cellular) noise, after Steven Worley's "A Cellular Texture Basis
// Function" (1996). One feature point per lattice cell, F1 (distance to the
// nearest feature point). Original implementation (MIT).
//
// Output: Euclidean distance, roughly [0, 1.3]; the display wrapper clamps.

import { hash2, hash3, hashU32, to01 } from './common'

export const worley2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
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

export const worley3 = (x: number, y: number, z: number): number => {
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
        const h = hash3(ix + dx, iy + dy, iz + dz)
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
