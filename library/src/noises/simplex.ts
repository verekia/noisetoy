// Simplex noise, implemented from the algorithm published by Ken Perlin
// ("Noise hardware", 2001; US patent 6,867,776 expired in 2022) with the
// skew/unskew formulation described in Stefan Gustavson's "Simplex noise
// demystified" (2005). Original implementation (MIT).
//
// Gradients are Gustavson's own 12 cube-edge vectors via the shared gradTable
// helpers, and the corner hashes are folded rather than chained — the same two
// choices Perlin makes, for the same reasons. Measured 2.6x faster in 2D and
// 2.4x in 3D against the trigonometric implementation this repo originally
// shipped (removed after losing consistently on every backend; the figures
// are recorded in implementations.ts rather than re-runnable). The win is
// smaller than Perlin's because simplex evaluates only 3 or 4 corners, so the
// skew and corner-ranking arithmetic — untouched here — is a larger share of
// what is left.
//
// Corner hashes reuse the base products: every corner offset is 0 or 1 on each
// axis, so it selects between `i * K` and `i * K + K` rather than multiplying
// again.
//
// KERNEL RADIUS, a known fork. The falloff is (0.5 - r^2)^4 in both 2D and 3D.
// For 2D that is Gustavson's reference. For 3D it is NEITHER of the two
// published lineages: the reference pairs 0.6 with exponent 4, and Gustavson &
// McEwan's 2022 correction pairs 0.5 with exponent 3, having shown 0.6 leaves
// the field discontinuous at simplex boundaries. Using 0.5 with exponent 4 is
// continuous like the correction but lower in amplitude than either, which is
// why the display norm is so far from the reference scale factor. It is left
// alone here deliberately: this change is about speed, and moving the kernel
// would alter the look on top of it. Worth revisiting separately.

import { gradTable2, gradTable3, hashU32, LATTICE_HX, LATTICE_HY, LATTICE_HZ } from './common.js'
import { SIMPLEX2_NORM, SIMPLEX3_NORM } from './normalization.js'

const F2 = 0.3660254037844386 // (sqrt(3) - 1) / 2
const G2 = 0.21132486540518713 // (3 - sqrt(3)) / 6
const F3 = 1 / 3
const G3 = 1 / 6

export const simplex2 = (x: number, y: number): number => {
  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const t = (i + j) * G2
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const i1 = x0 > y0 ? 1 : 0
  const j1 = 1 - i1
  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2
  const hx0 = Math.imul(i, LATTICE_HX)
  const hy0 = Math.imul(j, LATTICE_HY)
  const hx1 = (hx0 + LATTICE_HX) | 0
  const hy1 = (hy0 + LATTICE_HY) | 0
  let n = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 > 0) {
    t0 *= t0
    n += t0 * t0 * gradTable2(hashU32((hx0 + hy0) | 0), x0, y0)
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 > 0) {
    t1 *= t1
    n += t1 * t1 * gradTable2(hashU32(((i1 === 1 ? hx1 : hx0) + (j1 === 1 ? hy1 : hy0)) | 0), x1, y1)
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 > 0) {
    t2 *= t2
    n += t2 * t2 * gradTable2(hashU32((hx1 + hy1) | 0), x2, y2)
  }
  return n
}

export const simplex3 = (x: number, y: number, z: number): number => {
  const s = (x + y + z) * F3
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)
  let i1 = 0
  let j1 = 0
  let k1 = 0
  let i2 = 0
  let j2 = 0
  let k2 = 0
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1
      i2 = 1
      j2 = 1
    } else if (x0 >= z0) {
      i1 = 1
      i2 = 1
      k2 = 1
    } else {
      k1 = 1
      i2 = 1
      k2 = 1
    }
  } else {
    if (y0 < z0) {
      k1 = 1
      j2 = 1
      k2 = 1
    } else if (x0 < z0) {
      j1 = 1
      j2 = 1
      k2 = 1
    } else {
      j1 = 1
      i2 = 1
      j2 = 1
    }
  }
  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3
  const hx0 = Math.imul(i, LATTICE_HX)
  const hy0 = Math.imul(j, LATTICE_HY)
  const hz0 = Math.imul(k, LATTICE_HZ)
  const hx1 = (hx0 + LATTICE_HX) | 0
  const hy1 = (hy0 + LATTICE_HY) | 0
  const hz1 = (hz0 + LATTICE_HZ) | 0
  let n = 0
  let t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 > 0) {
    t0 *= t0
    n += t0 * t0 * gradTable3(hashU32((hx0 + hy0 + hz0) | 0), x0, y0, z0)
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 > 0) {
    t1 *= t1
    const h = ((i1 === 1 ? hx1 : hx0) + (j1 === 1 ? hy1 : hy0) + (k1 === 1 ? hz1 : hz0)) | 0
    n += t1 * t1 * gradTable3(hashU32(h), x1, y1, z1)
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 > 0) {
    t2 *= t2
    const h = ((i2 === 1 ? hx1 : hx0) + (j2 === 1 ? hy1 : hy0) + (k2 === 1 ? hz1 : hz0)) | 0
    n += t2 * t2 * gradTable3(hashU32(h), x2, y2, z2)
  }
  let t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 > 0) {
    t3 *= t3
    n += t3 * t3 * gradTable3(hashU32((hx1 + hy1 + hz1) | 0), x3, y3, z3)
  }
  return n
}

/** Simplex 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const simplex2dCanonical = (x: number, y: number): number => 0.5 + 0.5 * SIMPLEX2_NORM * simplex2(x, y)

/** Simplex 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const simplex3dCanonical = (x: number, y: number, z: number): number =>
  0.5 + 0.5 * SIMPLEX3_NORM * simplex3(x, y, z)
