// Perlin (gradient) noise tuned for CPU throughput — a candidate faster
// implementation of the same algorithm as noises/perlin.ts. Same lattice
// constants, same quintic fade, same gradient geometry; what changes is how a
// lattice corner becomes a gradient contribution, which is where the shipping
// implementation spends most of its integer work.
//
// Three things make this faster on a CPU:
//
// 1. CHEAPER CORNER HASHES, DIMENSION-SPLIT. The shipping code runs a full
//    lowbias32 per corner: two integer multiplies and three xor-shifts. Here
//    every selection bit is read from the TOP of the mix output — bit k of a
//    product depends only on input bits 0..k, so the top bits are what a
//    multiply mixes best — with signs in bits 31/30 and the 3D axis split in
//    the remaining 30 bits. How much mixing that read pattern needs turned
//    out to DIFFER BY DIMENSION, and each claim is only as good as the
//    offsets it was tested at:
//
//    2D: one xor-shift and one multiply by 2^32/phi (Knuth's constant) per
//    corner. Valid on the two-axis fold — marginals, parity, and joints at
//    +x/+y/+xy are all inside the 95% chi-square criticals. The pre-multiply
//    xor-shift is load-bearing: without it the corner mix is affine in the
//    lattice coordinates and neighbouring gradients correlate in a fixed
//    pattern.
//
//    3D: lowbias32 minus its final xor-shift (which only feeds low bits
//    nothing here reads) — two multiplies, two xor-shifts, two ops and the
//    u32 coercions cheaper than the shipping hashU32. The single-multiply
//    mix 2D uses is NOT valid on the three-axis fold: it passed the
//    single-axis joints this file originally tested, but corner pairs at
//    +yz and +xyz — pairs inside every Perlin cell — measure at chi-square
//    425 and 202 against a 143-df critical of 172. That defect SHIPPED in
//    this file's first version and was caught during the simplex pass, which
//    is why the battery now covers all seven cube offsets; with this mix the
//    worst joint is 158. The fix cost nothing measurable: the extra integer
//    work hides behind the FP dependency chain (242.4 ms defective vs
//    242.1 ms fixed, medians of 8 interleaved).
//
// 2. THE 2D PRE-MIX IS HOISTED. The xor-shift is applied to the two x
//    lattice products once (rx = x0 ^ (x0 >>> 16)) and a corner is just
//    rx ^ y0 before the multiply — two pre-mixes instead of four. The same
//    hoist on the three-axis fold fails adjacency (chi-square 216 in +x),
//    one more instance of 3D demanding more mixing than 2D.
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
// Statistics, measured over 1.2M lattice corners (2D) / 1M (3D), off-origin:
// gradient marginals, an even/odd checkerboard split, and adjacent-corner
// joints at EVERY offset a Perlin cell pairs — +x/+y/+xy in 2D, all seven of
// +x/+y/+z/+xy/+xz/+yz/+xyz in 3D — are inside the 95% chi-square criticals;
// the assembled field's mean, RMS, extrema and lattice-lag autocorrelation
// match the shipping perlin to three decimal places. The FIELD is a
// different draw — same statistics, different hash, so different pattern.
//
// Measured with `bun run bench:impl` (methodology in bench.ts): perlin3
// between 1.1x and 1.3x depending on the day's machine state (medians and
// bests agree within any single run); perlin2 ~1.1x. Re-measure before
// quoting more precision than that. CPU ONLY. On a
// GPU the trade is different — the avalanche this removes is integer work,
// which GPUs price differently. GLSL/WGSL/TSL counterparts live in
// perlin-fast.{glsl,wgsl,tsl}.ts and ship through ALT_VARIANTS, so that
// measurement is now possible — it has not been taken. Promotion would also
// change the field every consumer sees, since the draw differs, and still
// needs the tileable paths.
//
// Raw amplitude matches noises/perlin.ts: gradients of length sqrt(2) in both
// dimensions, so the same display norms would apply.
//
// SECOND PASS, so nobody re-treads it: this is the measured floor of the
// scalar form on the CPU. Decomposing the cost showed the floors + fades +
// lerp tree alone run ~156 ms in the 8M-sample harness against ~190 ms (2D) /
// ~222 ms (3D) for the full function — the integer hashing this file already
// shrank is now a minority of the runtime and sits latency-hidden behind the
// FP dependency chain. Five further variants all measured flat or worse over
// 8-12 interleaved repeats:
//
//   - Hoisting the xy pre-mix in 3D (corner = imul(rxy ^ z, K), two ops per
//     corner instead of five): flat, and it carries the per-slab correlation
//     risk along z that sank the hoisted form in the header.
//   - Weighted-sum (barycentric) interpolation replacing the lerp tree, which
//     shortens the FP critical path on paper: flat in 3D, slightly worse in
//     2D — the out-of-order core already overlaps the tree with gradient work.
//   - Estrin-reassociated fade (10t^3 + t^4(6t - 15), two levels shorter):
//     +4.5% on one run, exactly 1.00x on a dedicated 12-repeat interleaved
//     rerun. A lesson in noisy-box benchmarking, hence the median in bench.ts.
//   - Branchless sign selection in 2D (multiply by 1 - ((h >>> 30) & 2)): flat.
//   - Bias-trick floor (((x + 2^20) | 0) - 2^20): slightly faster in 2D, much
//     slower in 3D, and it silently narrows the domain to |x| < 2^20. Rejected.
//
// What is NOT at its floor is call granularity: sampling a plane re-derives
// every per-row and per-cell quantity per sample, and a row-walking evaluator
// could skip all hashing inside a cell. That is an API change (the registry
// contract is a pure scalar function), not an implementation of this noise,
// so it does not belong in this file.

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
 * One of Perlin's 12 cube-edge gradients dotted with (x, y, z). Same
 * range-split geometry as gradTable3: the axis comparisons collapse to two
 * selects because axis 0 and 1 share a = x and axis 1 and 2 share b = z.
 *
 * The mix is lowbias32 WITHOUT ITS FINAL XOR-SHIFT (only the top bits are
 * consumed), not the single multiply the 2D path uses. The single-multiply
 * mix is statistically defective on the three-axis fold: corner pairs at
 * +yz and +xyz offsets — pairs inside every Perlin cell — measured at
 * chi-square 425 and 202 against a 143-df critical of 172. This shipped
 * that way at first; the simplex pass caught it. With this mix the full
 * 7-offset battery passes (worst joint 158), and the fix costs nothing
 * measurable — the extra integer work hides behind the FP chain.
 */
const grad3 = (s: number, x: number, y: number, z: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
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
