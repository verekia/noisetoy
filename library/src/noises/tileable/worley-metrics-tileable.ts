// Tileable Manhattan/Chebyshev Worley. As in worley-tileable.ts, the cell
// coordinates used for hashing feature points are wrapped modulo an integer
// period in x and y; the distances themselves stay geometric (unwrapped).
// This wrapping is deliberately kept out of the core implementations.

import { hash2, hash3, hashU32, imod, to01 } from '../common'

export const manhattan2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d = Math.abs(vx) + Math.abs(vy)
      if (d < f1) f1 = d
    }
  }
  return f1
}

export const manhattan3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
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
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d = Math.abs(vx) + Math.abs(vy) + Math.abs(vz)
        if (d < f1) f1 = d
      }
    }
  }
  return f1
}

export const chebyshev2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d = Math.max(Math.abs(vx), Math.abs(vy))
      if (d < f1) f1 = d
    }
  }
  return f1
}

export const chebyshev3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
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
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d = Math.max(Math.abs(vx), Math.abs(vy), Math.abs(vz))
        if (d < f1) f1 = d
      }
    }
  }
  return f1
}
