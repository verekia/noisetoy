// SUPERSEDED. Kept so the comparison against the shipping implementation can
// be re-run; see implementations.ts and `bun run bench:impl`.
//
// Simplex noise, implemented from the algorithm published by Ken Perlin
// ("Noise hardware", 2001; US patent 6,867,776 expired in 2022) with the
// skew/unskew formulation described in Stefan Gustavson's "Simplex noise
// demystified" (2005). Gradients come from the shared integer hash instead of
// a permutation table. Original implementation (MIT).
//
// The falloff kernel is (0.5 - r^2)^4, which stays C1-continuous across
// simplex boundaries in both 2D and 3D.

import { gradDot2, gradDot3, hash2, hash3 } from '../noises/common'

const F2 = 0.3660254037844386 // (sqrt(3) - 1) / 2
const G2 = 0.21132486540518713 // (3 - sqrt(3)) / 6
const F3 = 1 / 3
const G3 = 1 / 6

const contrib2 = (dx: number, dy: number, h: number): number => {
  let t = 0.5 - dx * dx - dy * dy
  if (t <= 0) return 0
  t *= t
  return t * t * gradDot2(h, dx, dy)
}

const contrib3 = (dx: number, dy: number, dz: number, h: number): number => {
  let t = 0.5 - dx * dx - dy * dy - dz * dz
  if (t <= 0) return 0
  t *= t
  return t * t * gradDot3(h, dx, dy, dz)
}

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
  return contrib2(x0, y0, hash2(i, j)) + contrib2(x1, y1, hash2(i + i1, j + j1)) + contrib2(x2, y2, hash2(i + 1, j + 1))
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
  return (
    contrib3(x0, y0, z0, hash3(i, j, k)) +
    contrib3(x1, y1, z1, hash3(i + i1, j + j1, k + k1)) +
    contrib3(x2, y2, z2, hash3(i + i2, j + j2, k + k2)) +
    contrib3(x3, y3, z3, hash3(i + 1, j + 1, k + 1))
  )
}
