// Value noise: random values on an integer lattice, quintic-smoothed interpolation.
// Original implementation (MIT). Output is naturally in [0, 1].

import { fade, hash2, hash3, lerp, to01 } from './common'

export const value2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const n00 = to01(hash2(ix, iy))
  const n10 = to01(hash2(ix + 1, iy))
  const n01 = to01(hash2(ix, iy + 1))
  const n11 = to01(hash2(ix + 1, iy + 1))
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}

export const value3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const n000 = to01(hash3(ix, iy, iz))
  const n100 = to01(hash3(ix + 1, iy, iz))
  const n010 = to01(hash3(ix, iy + 1, iz))
  const n110 = to01(hash3(ix + 1, iy + 1, iz))
  const n001 = to01(hash3(ix, iy, iz + 1))
  const n101 = to01(hash3(ix + 1, iy, iz + 1))
  const n011 = to01(hash3(ix, iy + 1, iz + 1))
  const n111 = to01(hash3(ix + 1, iy + 1, iz + 1))
  const nz0 = lerp(lerp(n000, n100, ux), lerp(n010, n110, ux), uy)
  const nz1 = lerp(lerp(n001, n101, ux), lerp(n011, n111, ux), uy)
  return lerp(nz0, nz1, uz)
}
