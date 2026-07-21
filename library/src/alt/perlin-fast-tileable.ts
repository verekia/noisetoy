// A SEPARATE candidate implementation, not a tileable slot on fib-hash: it
// exists so the explorer's implementation picker and /bench can put
// 'fib-hash' and 'fib-hash-tileable' side by side and price tileability as
// an implementation choice. Same mixes, same gradient reads as
// perlin-fast.ts (pick / grad3 are imported from there); the only change is
// that the lattice wraps every 8 cells — the perlin registry tile,
// `scale: 8` — in x and y before the fold, so the field tiles seamlessly at
// the explorer's own tile size. Raise the layer Scale to 2 or 4 to see the
// repetition.
//
// Because the baked period is a power of two, the wrap is a two's-complement
// AND (ix & 7 == imod(ix, 8) for either sign), not the double-modulo imod
// the shipping tileable paths pay. What cannot be masked away is the seam
// itself: the core's "(i + 1) * K == i * K + K" neighbour shortcut dies
// there, so each wrapped axis pays its own AND and a real multiply for the
// far plane. z is not wrapped, matching the registry contract (tiles repeat
// in the plane; 3D adds animated depth), and keeps the shortcut.
//
// The statistics quoted in perlin-fast.ts carry over unchanged: wrapping
// only restricts WHICH lattice products occur (an 8 x 8 x open-z subset),
// exactly as it does for the shipping wrap-then-hash. The measured numbers
// live in the inventory entry.

import { fade, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../noises/common'
import { grad3, pick } from './perlin-fast'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1

/** The baked tiling period minus one: the perlin registry tile is 8 cells. */
const PMASK = 7

export const perlinFastTileable2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const s = fx + fy
  const d = fx - fy
  const s1 = s - 1
  const x0 = Math.imul(ix & PMASK, LATTICE_HX)
  const x1 = Math.imul((ix + 1) & PMASK, LATTICE_HX)
  const y0 = Math.imul(iy & PMASK, LATTICE_HY)
  const y1 = Math.imul((iy + 1) & PMASK, LATTICE_HY)
  const rx0 = x0 ^ (x0 >>> 16)
  const rx1 = x1 ^ (x1 >>> 16)
  const g00 = pick(Math.imul(rx0 ^ y0, FIB), s, d)
  const g10 = pick(Math.imul(rx1 ^ y0, FIB), s1, d - 1)
  const g01 = pick(Math.imul(rx0 ^ y1, FIB), s1, d + 1)
  const g11 = pick(Math.imul(rx1 ^ y1, FIB), s - 2, d)
  return lerp(lerp(g00, g10, ux), lerp(g01, g11, ux), uy)
}

export const perlinFastTileable3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const fx1 = fx - 1
  const fy1 = fy - 1
  const fz1 = fz - 1
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = Math.imul(ix & PMASK, LATTICE_HX)
  const x1 = Math.imul((ix + 1) & PMASK, LATTICE_HX)
  const y0 = Math.imul(iy & PMASK, LATTICE_HY)
  const y1 = Math.imul((iy + 1) & PMASK, LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const z1 = (z0 + LATTICE_HZ) | 0
  const xy00 = (x0 + y0) | 0
  const xy10 = (x1 + y0) | 0
  const xy01 = (x0 + y1) | 0
  const xy11 = (x1 + y1) | 0
  const g000 = grad3((xy00 + z0) | 0, fx, fy, fz)
  const g100 = grad3((xy10 + z0) | 0, fx1, fy, fz)
  const g010 = grad3((xy01 + z0) | 0, fx, fy1, fz)
  const g110 = grad3((xy11 + z0) | 0, fx1, fy1, fz)
  const g001 = grad3((xy00 + z1) | 0, fx, fy, fz1)
  const g101 = grad3((xy10 + z1) | 0, fx1, fy, fz1)
  const g011 = grad3((xy01 + z1) | 0, fx, fy1, fz1)
  const g111 = grad3((xy11 + z1) | 0, fx1, fy1, fz1)
  const nz0 = lerp(lerp(g000, g100, ux), lerp(g010, g110, ux), uy)
  const nz1 = lerp(lerp(g001, g101, ux), lerp(g011, g111, ux), uy)
  return lerp(nz0, nz1, uz)
}
