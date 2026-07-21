// Simplex Value noise — an original experiment for this repo, built for speed.
//
// Value noise evaluated on the simplex lattice: instead of interpolating 4/8
// hypercube corners (value noise) or summing gradient contributions (simplex),
// each simplex corner contributes its hashed *value* weighted by the radial
// kernel (0.5 - r^2)^4. That needs only 3 hashes in 2D and 4 in 3D, with no
// gradients and no trig — the cheapest smooth lattice noise in this repo.
//
// Compared to interpolated value noise the result is blobbier (values peak at
// lattice sites), giving a soft triangular-cellular character.
//
// Provenance / disclosure: the simplex-lattice skew/unskew and radial kernel
// come from Ken Perlin's simplex noise (US patent 6,867,776, expired January
// 2022), in the formulation described by Stefan Gustavson; the value-based
// contribution replacing gradients appears to be original.
// Original implementation (MIT).

import { hash2, hash3, to01 } from './common.js'
import { SIMPLEX_VALUE_NORM } from './normalization.js'

const F2 = 0.3660254037844386 // (sqrt(3) - 1) / 2
const G2 = 0.21132486540518713 // (3 - sqrt(3)) / 6
const F3 = 1 / 3
const G3 = 1 / 6

const contribV2 = (dx: number, dy: number, h: number): number => {
  let t = 0.5 - dx * dx - dy * dy
  if (t <= 0) return 0
  t *= t
  return t * t * (to01(h) * 2 - 1)
}

const contribV3 = (dx: number, dy: number, dz: number, h: number): number => {
  let t = 0.5 - dx * dx - dy * dy - dz * dz
  if (t <= 0) return 0
  t *= t
  return t * t * (to01(h) * 2 - 1)
}

export const simplexValue2 = (x: number, y: number): number => {
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
  return (
    contribV2(x0, y0, hash2(i, j)) + contribV2(x1, y1, hash2(i + i1, j + j1)) + contribV2(x2, y2, hash2(i + 1, j + 1))
  )
}

export const simplexValue3 = (x: number, y: number, z: number): number => {
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
  return (
    contribV3(x0, y0, z0, hash3(i, j, k)) +
    contribV3(x1, y1, z1, hash3(i + i1, j + j1, k + k1)) +
    contribV3(x2, y2, z2, hash3(i + i2, j + j2, k + k2)) +
    contribV3(x3, y3, z3, hash3(i + 1, j + 1, k + 1))
  )
}

/** Simplex Value 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const simplexValue2dCanonical = (x: number, y: number): number =>
  0.5 + 0.5 * SIMPLEX_VALUE_NORM * simplexValue2(x, y)

/** Simplex Value 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const simplexValue3dCanonical = (x: number, y: number, z: number): number =>
  0.5 + 0.5 * SIMPLEX_VALUE_NORM * simplexValue3(x, y, z)
