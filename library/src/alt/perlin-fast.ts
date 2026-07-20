// Perlin (gradient) noise tuned for CPU throughput — a candidate faster
// implementation of the same algorithm as noises/perlin.ts. Same lattice
// constants, same quintic fade, same gradient geometry; what changes is how a
// lattice corner becomes a gradient contribution, which is where the shipping
// implementation spends most of its integer work.
//
// Three things make this faster on a CPU:
//
// 1. ONE MULTIPLY PER CORNER INSTEAD OF A FULL AVALANCHE. The shipping code
//    runs lowbias32 per corner: two integer multiplies and three xor-shifts.
//    Here a corner costs one xor-shift and one multiply by 2^32/phi (Knuth's
//    multiplicative hashing constant), and every selection bit is read from
//    the TOP of the product — bit k of a product depends only on input bits
//    0..k, so the top bits are the only well-mixed ones and they are exactly
//    the ones a single multiply mixes best. Signs come from bits 31 and 30;
//    the 3D axis split reads the remaining 30 bits. The xor-shift before the
//    multiply is load-bearing: without it the corner mix is affine in the
//    lattice coordinates, so neighbouring corners' hashes differ by a
//    constant and their gradients correlate in a fixed pattern.
//
// 2. THE PRE-MIX IS HOISTED WHERE THE STATISTICS ALLOW IT. In 2D the
//    xor-shift is applied to the two x lattice products once (rx = x0 ^
//    (x0 >>> 16)) and a corner is just rx ^ y0 before the multiply — two
//    pre-mixes instead of four. The same trick in 3D FAILS adjacency
//    statistics: with h = imul(rx ^ y0 ^ z0, K) the joint distribution of
//    gradients one step apart in x comes out at chi-square 216 against a
//    143-df critical value of 172. So 3D keeps the per-corner mix of the
//    folded sum, s ^ (s >>> 16), which passes (chi-square 126 in +x, 153 in
//    +z over 1.7M corners; marginals 10.8 against a critical 19.7).
//
// 3. FACTORED 2D CORNER DOTS. The 2D gradient set is the four diagonals
//    (+-1, +-1) — the same set the shipping gradTable2 draws, whose slots 4-7
//    duplicate slots 0-3 with the operands swapped — and a diagonal dot
//    product is +-(fx + fy) or +-(fx - fy) up to a per-corner integer shift.
//    Both bases are computed once and each corner just selects one, adds its
//    constant offset (folded into precomputed s - 1, s - 2, d - 1, d + 1) and
//    flips a sign. No per-corner component selects at all.
//
// 3D gradients are Perlin's 12 cube-edge vectors, selected by the same
// integer range split as gradTable3 (all twelve equally likely), reading the
// low 30 bits so the sign bits at 30/31 stay disjoint from the axis choice.
//
// Statistics, measured over 1.4M lattice corners (2D) / 1.7M (3D), off-origin:
// gradient marginals, adjacent-corner joints along each axis and the diagonal,
// and an even/odd checkerboard split are all inside the 95% chi-square
// criticals; the assembled field's mean, RMS, extrema and lattice-lag
// autocorrelation match the shipping perlin to three decimal places. The FIELD
// is a different draw — same statistics, different hash, so different pattern.
//
// Measured with `bun run bench:impl` (methodology in bench.ts): ~1.3x the
// shipping perlin3, stable across runs; perlin2 varied 1.08-1.27x run to run
// on the measurement box, so call it ~1.1x and re-measure before believing
// more. CPU ONLY. On a
// GPU the trade is different — the avalanche this removes is integer work,
// which GPUs price differently — and no GLSL/WGSL/TSL backends exist yet, so
// this cannot ship: registry variants need all four languages. Promotion
// would also change the field every consumer sees, since the draw differs.
//
// Raw amplitude matches noises/perlin.ts: gradients of length sqrt(2) in both
// dimensions, so the same display norms would apply.

import { fade, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1

/** Diagonal dot: bit 30 picks the (fx + fy) or (fx - fy) base, bit 31 the sign. */
const pick = (h: number, sv: number, dv: number): number => {
  const v = (h & 0x40000000) === 0 ? sv : dv
  return h < 0 ? -v : v
}

export const perlinFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const s = fx + fy
  const d = fx - fy
  const s1 = s - 1
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const rx0 = x0 ^ (x0 >>> 16)
  const rx1 = x1 ^ (x1 >>> 16)
  const g00 = pick(Math.imul(rx0 ^ y0, FIB), s, d)
  const g10 = pick(Math.imul(rx1 ^ y0, FIB), s1, d - 1)
  const g01 = pick(Math.imul(rx0 ^ y1, FIB), s1, d + 1)
  const g11 = pick(Math.imul(rx1 ^ y1, FIB), s - 2, d)
  return lerp(lerp(g00, g10, ux), lerp(g01, g11, ux), uy)
}

/**
 * One of Perlin's 12 cube-edge gradients dotted with (x, y, z), from the top
 * bits of a single multiply. Same range-split geometry as gradTable3: the
 * axis comparisons collapse to two selects because axis 0 and 1 share a = x
 * and axis 1 and 2 share b = z.
 */
const grad3 = (s: number, x: number, y: number, z: number): number => {
  const h = Math.imul(s ^ (s >>> 16), FIB)
  const t = h & 0x3fffffff
  // 2^30 / 3 and 2 * 2^30 / 3.
  const a = t < 715827882 ? x : y
  const b = t < 357913941 ? y : z
  return ((h & 0x40000000) === 0 ? a : -a) + (h < 0 ? -b : b)
}

export const perlinFast3 = (x: number, y: number, z: number): number => {
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
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
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
