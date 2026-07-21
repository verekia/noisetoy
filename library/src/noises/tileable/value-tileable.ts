// Tileable value noise. Same lattice logic as value.ts, but lattice
// coordinates are wrapped modulo an integer period (in x and y) before
// hashing, so the pattern repeats seamlessly every `px` x `py` cells.
// This wrapping is deliberately kept out of the core implementation.

import { fade, hash2, hash3, imod, lerp, to01 } from '../common.js'

export const value2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const x0 = imod(ix, px)
  const x1 = imod(ix + 1, px)
  const y0 = imod(iy, py)
  const y1 = imod(iy + 1, py)
  const n00 = to01(hash2(x0, y0))
  const n10 = to01(hash2(x1, y0))
  const n01 = to01(hash2(x0, y1))
  const n11 = to01(hash2(x1, y1))
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}

export const value3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = imod(ix, px)
  const x1 = imod(ix + 1, px)
  const y0 = imod(iy, py)
  const y1 = imod(iy + 1, py)
  const n000 = to01(hash3(x0, y0, iz))
  const n100 = to01(hash3(x1, y0, iz))
  const n010 = to01(hash3(x0, y1, iz))
  const n110 = to01(hash3(x1, y1, iz))
  const n001 = to01(hash3(x0, y0, iz + 1))
  const n101 = to01(hash3(x1, y0, iz + 1))
  const n011 = to01(hash3(x0, y1, iz + 1))
  const n111 = to01(hash3(x1, y1, iz + 1))
  const nz0 = lerp(lerp(n000, n100, ux), lerp(n010, n110, ux), uy)
  const nz1 = lerp(lerp(n001, n101, ux), lerp(n011, n111, ux), uy)
  return lerp(nz0, nz1, uz)
}

/** Value 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const value2dCanonicalTileable = value2Tileable

/** Value 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const value3dCanonicalTileable = value3Tileable
