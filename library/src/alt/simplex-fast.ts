// Simplex noise tuned for CPU throughput — a candidate implementation of the
// same algorithm as noises/simplex.ts. Same skew/unskew, same kernel (radius
// 0.5, exponent 4, including the shipping code's documented 3D kernel fork),
// same gradient geometry. Three changes, and an honest accounting of what
// they bought:
//
// 1. CHEAPER CORNER HASHES, dimension-split. 2D corners hash with one
//    xor-shift and one multiply by 2^32/phi, selection bits read from the top
//    of the product — the scheme is statistically valid on the TWO-axis
//    lattice fold: gradient marginals and joints at +x/+y/+xy all sit inside
//    the 95% chi-square criticals. The SAME mix on the three-axis fold is NOT
//    valid: corner pairs at +yz and +xyz offsets — pairs a simplex traversal
//    and a Perlin cell both blend — came out at chi-square 425 and 202
//    against a 143-df critical of 172. Finding that defect during this pass
//    is what forced the corner-mix fix in alt/perlin-fast.ts and
//    alt/worley-fast.ts. 3D therefore uses lowbias32 MINUS ITS FINAL
//    XOR-SHIFT (only top bits are consumed; the full 7-offset battery passes,
//    worst joint 158), which saves two operations per corner over the
//    shipping hashU32 and avoids its u32 coercions.
//
// 2. BRANCHLESS CORNER RANKING in 3D. The shipping nested ladder is replaced
//    by boolean algebra over a = x>=y, b = y>=z, c = x>=z:
//    i1 = a&(b|c), j1 = !a&b, k1 = !b&(!a|!c), i2 = a|(b&c), j2 = !a|b,
//    k2 = !b|(!a&!c). Verified equal to the ladder on 200k random triples
//    plus every tie pattern — same simplex traversal, no data-dependent
//    branches.
//
// 3. SINGLE-SELECT CORNER SUMS. Corner 1 adds exactly one lattice constant to
//    the base sum and corner 2 subtracts exactly one from the far corner's
//    sum, so each costs one two-way select instead of three.
//
// Measured with `bun run bench:impl`: 1.1-1.25x the shipping simplex2 run to
// run, and a TIE in 3D — 0.99-1.05x, best and median disagreeing across runs.
// The decomposition says why: the FP skeleton (skew, ranking, kernels) is
// ~303 ms of the shipping ~365 ms in the bench harness, simplex only hashes
// 3-4 corners, and those hashes sit off the FP critical path. This candidate
// is kept for the 2D win; treat the 3D column as noise until someone breaks
// the tie. GLSL/WGSL/TSL counterparts live in simplex-fast.{glsl,wgsl,tsl}.ts
// and ship through ALT_VARIANTS; the GPU measurement they enabled came back
// a tie as well (0.97-0.99x, WebGL and WebGPU medians). Same promotion bar
// as the other candidates.
//
// The field is a different draw from the shipping one — different hash, same
// statistics (field mean/rms/extrema match to three decimals).

import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const F2 = 0.3660254037844386 // (sqrt(3) - 1) / 2
const G2 = 0.21132486540518713 // (3 - sqrt(3)) / 6
const F3 = 1 / 3
const G3 = 1 / 6

/** Diagonal-gradient dot from the top bits of a single multiply (2D only). */
const grad2 = (s: number, x: number, y: number): number => {
  const h = Math.imul(s ^ (s >>> 16), FIB)
  return (h < 0 ? -x : x) + ((h & 0x40000000) === 0 ? y : -y)
}

/**
 * One of the 12 cube-edge gradients dotted with (x, y, z). The mix is
 * lowbias32 without its final xor-shift — the single-multiply mix fails
 * adjacency at +yz/+xyz on the three-axis fold (see header).
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

export const simplexFast2 = (x: number, y: number): number => {
  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const t = (i + j) * G2
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const i1 = x0 > y0 ? 1 : 0
  const x1 = x0 - i1 + G2
  const y1 = y0 - (1 - i1) + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2
  const s0 = (Math.imul(i, LATTICE_HX) + Math.imul(j, LATTICE_HY)) | 0
  const s2 = (s0 + LATTICE_HX + LATTICE_HY) | 0
  // The middle corner adds exactly one lattice constant.
  const s1 = (s0 + (i1 === 1 ? LATTICE_HX : LATTICE_HY)) | 0
  let n = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 > 0) {
    t0 *= t0
    n += t0 * t0 * grad2(s0, x0, y0)
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 > 0) {
    t1 *= t1
    n += t1 * t1 * grad2(s1, x1, y1)
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 > 0) {
    t2 *= t2
    n += t2 * t2 * grad2(s2, x2, y2)
  }
  return n
}

export const simplexFast3 = (x: number, y: number, z: number): number => {
  const s = (x + y + z) * F3
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)
  const a = x0 >= y0 ? 1 : 0
  const b = y0 >= z0 ? 1 : 0
  const c = x0 >= z0 ? 1 : 0
  const na = 1 - a
  const nb = 1 - b
  const i1 = a & (b | c)
  const j1 = na & b
  const k1 = nb & (na | (1 - c))
  const i2 = a | (b & c)
  const j2 = na | b
  const k2 = nb | (na & (1 - c))
  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3
  const s0 = (Math.imul(i, LATTICE_HX) + Math.imul(j, LATTICE_HY) + Math.imul(k, LATTICE_HZ)) | 0
  const s3 = (s0 + LATTICE_HX + LATTICE_HY + LATTICE_HZ) | 0
  // Exactly one of i1/j1/k1 is 1, and exactly one of i2/j2/k2 is 0.
  const s1 = (s0 + (i1 === 1 ? LATTICE_HX : j1 === 1 ? LATTICE_HY : LATTICE_HZ)) | 0
  const s2 = (s3 - (i2 === 0 ? LATTICE_HX : j2 === 0 ? LATTICE_HY : LATTICE_HZ)) | 0
  let n = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 > 0) {
    t0 *= t0
    n += t0 * t0 * grad3(s0, x0, y0, z0)
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 > 0) {
    t1 *= t1
    n += t1 * t1 * grad3(s1, x1, y1, z1)
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 > 0) {
    t2 *= t2
    n += t2 * t2 * grad3(s2, x2, y2, z2)
  }
  let t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 > 0) {
    t3 *= t3
    n += t3 * t3 * grad3(s3, x3, y3, z3)
  }
  return n
}
