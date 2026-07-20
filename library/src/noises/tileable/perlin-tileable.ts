// Tileable Perlin. Lattice coordinates are wrapped modulo an integer period in
// x and y before hashing, so the pattern repeats seamlessly every px x py cells.
// This wrapping is deliberately kept out of the core implementation.
//
// The core's "(i + 1) * K == i * K + K" shortcut does not survive wrapping —
// at the seam imod(i + 1) is 0, not imod(i) + 1 — so the far plane of each
// wrapped axis costs a real multiply here. z is not wrapped and keeps the
// shortcut.

import { fade, gradTable2, gradTable3, hashU32, imod, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../common'

export const perlin2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const x0 = Math.imul(imod(ix, px), LATTICE_HX)
  const x1 = Math.imul(imod(ix + 1, px), LATTICE_HX)
  const y0 = Math.imul(imod(iy, py), LATTICE_HY)
  const y1 = Math.imul(imod(iy + 1, py), LATTICE_HY)
  const g00 = gradTable2(hashU32((x0 + y0) | 0), fx, fy)
  const g10 = gradTable2(hashU32((x1 + y0) | 0), fx - 1, fy)
  const g01 = gradTable2(hashU32((x0 + y1) | 0), fx, fy - 1)
  const g11 = gradTable2(hashU32((x1 + y1) | 0), fx - 1, fy - 1)
  return lerp(lerp(g00, g10, ux), lerp(g01, g11, ux), uy)
}

export const perlin3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = Math.imul(imod(ix, px), LATTICE_HX)
  const x1 = Math.imul(imod(ix + 1, px), LATTICE_HX)
  const y0 = Math.imul(imod(iy, py), LATTICE_HY)
  const y1 = Math.imul(imod(iy + 1, py), LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const z1 = (z0 + LATTICE_HZ) | 0
  const g000 = gradTable3(hashU32((x0 + y0 + z0) | 0), fx, fy, fz)
  const g100 = gradTable3(hashU32((x1 + y0 + z0) | 0), fx - 1, fy, fz)
  const g010 = gradTable3(hashU32((x0 + y1 + z0) | 0), fx, fy - 1, fz)
  const g110 = gradTable3(hashU32((x1 + y1 + z0) | 0), fx - 1, fy - 1, fz)
  const g001 = gradTable3(hashU32((x0 + y0 + z1) | 0), fx, fy, fz - 1)
  const g101 = gradTable3(hashU32((x1 + y0 + z1) | 0), fx - 1, fy, fz - 1)
  const g011 = gradTable3(hashU32((x0 + y1 + z1) | 0), fx, fy - 1, fz - 1)
  const g111 = gradTable3(hashU32((x1 + y1 + z1) | 0), fx - 1, fy - 1, fz - 1)
  const nz0 = lerp(lerp(g000, g100, ux), lerp(g010, g110, ux), uy)
  const nz1 = lerp(lerp(g001, g101, ux), lerp(g011, g111, ux), uy)
  return lerp(nz0, nz1, uz)
}
