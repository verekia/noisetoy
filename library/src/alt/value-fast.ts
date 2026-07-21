// Value noise tuned for CPU throughput — a candidate faster implementation
// of the same algorithm as noises/value.ts. Same lattice, same quintic fade,
// same [0, 1) output; what changes is what a corner costs.
//
// The shipping value2/value3 spend two / three chained lowbias32 avalanches
// per corner (hash2/hash3). Here the lattice products are folded as in
// alt/worley-fast.ts — per-axis odd-constant multiplies, neighbours one add
// away — and each corner costs ONE mix. The mix differs by dimension for the
// measured reasons documented in worley-fast.ts: 2D uses the fib1 shape
// (xor-shift, multiply by 2^32/phi, closing xor-shift), which passes the
// position battery on the two-axis fold; 3D uses the full lowbias32 shape,
// because fib1 fails the diagonal joints on a three-axis fold.
//
// Corner values read the TOP 16 (2D) / 24 (3D) bits of the mix, quantizing
// the corner value to 2^-16 / 2^-24 of the unit range against the shipping
// 2^-32 — both are far below what interpolation and an 8-bit display can
// resolve.
//
// The FIELD is a different draw from the shipping one — different hash, same
// distribution: mean/rms/extrema match the shipping value to three decimals
// over 2M samples. Measured with `bun run bench:impl`: ~1.4x the shipping
// value3 on the CPU; value2 reads ~1.35x in the full suite and ~1.65x
// isolated (the megamorphic-harness caveat in bench.ts).

import { fade, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV24 = 1 / 16777216

const corner2 = (s: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  return (h >>> 16) * INV16
}

const corner3 = (s: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return (h >>> 8) * INV24
}

export const valueFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const n00 = corner2(x0 + y0)
  const n10 = corner2(x1 + y0)
  const n01 = corner2(x0 + y1)
  const n11 = corner2(x1 + y1)
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}

export const valueFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  const uz = fade(z - iz)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const z1 = (z0 + LATTICE_HZ) | 0
  const n000 = corner3(x0 + y0 + z0)
  const n100 = corner3(x1 + y0 + z0)
  const n010 = corner3(x0 + y1 + z0)
  const n110 = corner3(x1 + y1 + z0)
  const n001 = corner3(x0 + y0 + z1)
  const n101 = corner3(x1 + y0 + z1)
  const n011 = corner3(x0 + y1 + z1)
  const n111 = corner3(x1 + y1 + z1)
  const nz0 = lerp(lerp(n000, n100, ux), lerp(n010, n110, ux), uy)
  const nz1 = lerp(lerp(n001, n101, ux), lerp(n011, n111, ux), uy)
  return lerp(nz0, nz1, uz)
}
