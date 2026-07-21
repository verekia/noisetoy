// 4D simplex noise, after Ken Perlin (2001) with the rank-based corner
// ordering described by Stefan Gustavson. Gradients are the classic 4D set
// (one component zero, the other three ±1 — 32 directions), selected by hash
// bits instead of a permutation table. Original implementation (MIT).
//
// Used as the backing noise for the tileable 2D simplex path (4D torus trick).
//
// The falloff kernel is (0.6 - r^2)^4: in 4D a 0.5 radius leaves regions
// beyond the reach of every corner (visible flat spots), so the classic 0.6
// radius is used, trading exact C1 continuity for coverage as in Gustavson's
// reference implementation.

import { hash4 } from './common.js'

const F4 = 0.30901699437494745 // (sqrt(5) - 1) / 4
const G4 = 0.1381966011250105 // (5 - sqrt(5)) / 20

export const grad4Dot = (h: number, x: number, y: number, z: number, w: number): number => {
  const b = h & 31
  const zi = b >> 3
  const s0 = (b & 1) === 0 ? 1 : -1
  const s1 = (b & 2) === 0 ? 1 : -1
  const s2 = (b & 4) === 0 ? 1 : -1
  if (zi === 0) return s0 * y + s1 * z + s2 * w
  if (zi === 1) return s0 * x + s1 * z + s2 * w
  if (zi === 2) return s0 * x + s1 * y + s2 * w
  return s0 * x + s1 * y + s2 * z
}

const contrib4 = (dx: number, dy: number, dz: number, dw: number, h: number): number => {
  let t = 0.6 - dx * dx - dy * dy - dz * dz - dw * dw
  if (t <= 0) return 0
  t *= t
  return t * t * grad4Dot(h, dx, dy, dz, dw)
}

export const simplex4 = (x: number, y: number, z: number, w: number): number => {
  const s = (x + y + z + w) * F4
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)
  const l = Math.floor(w + s)
  const t = (i + j + k + l) * G4
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)
  const w0 = w - (l - t)
  let rankx = 0
  let ranky = 0
  let rankz = 0
  let rankw = 0
  if (x0 > y0) rankx++
  else ranky++
  if (x0 > z0) rankx++
  else rankz++
  if (x0 > w0) rankx++
  else rankw++
  if (y0 > z0) ranky++
  else rankz++
  if (y0 > w0) ranky++
  else rankw++
  if (z0 > w0) rankz++
  else rankw++
  const i1 = rankx >= 3 ? 1 : 0
  const j1 = ranky >= 3 ? 1 : 0
  const k1 = rankz >= 3 ? 1 : 0
  const l1 = rankw >= 3 ? 1 : 0
  const i2 = rankx >= 2 ? 1 : 0
  const j2 = ranky >= 2 ? 1 : 0
  const k2 = rankz >= 2 ? 1 : 0
  const l2 = rankw >= 2 ? 1 : 0
  const i3 = rankx >= 1 ? 1 : 0
  const j3 = ranky >= 1 ? 1 : 0
  const k3 = rankz >= 1 ? 1 : 0
  const l3 = rankw >= 1 ? 1 : 0
  const x1 = x0 - i1 + G4
  const y1 = y0 - j1 + G4
  const z1 = z0 - k1 + G4
  const w1 = w0 - l1 + G4
  const x2 = x0 - i2 + 2 * G4
  const y2 = y0 - j2 + 2 * G4
  const z2 = z0 - k2 + 2 * G4
  const w2 = w0 - l2 + 2 * G4
  const x3 = x0 - i3 + 3 * G4
  const y3 = y0 - j3 + 3 * G4
  const z3 = z0 - k3 + 3 * G4
  const w3 = w0 - l3 + 3 * G4
  const x4 = x0 - 1 + 4 * G4
  const y4 = y0 - 1 + 4 * G4
  const z4 = z0 - 1 + 4 * G4
  const w4 = w0 - 1 + 4 * G4
  return (
    contrib4(x0, y0, z0, w0, hash4(i, j, k, l)) +
    contrib4(x1, y1, z1, w1, hash4(i + i1, j + j1, k + k1, l + l1)) +
    contrib4(x2, y2, z2, w2, hash4(i + i2, j + j2, k + k2, l + l2)) +
    contrib4(x3, y3, z3, w3, hash4(i + i3, j + j3, k + k3, l + l3)) +
    contrib4(x4, y4, z4, w4, hash4(i + 1, j + 1, k + 1, l + 1))
  )
}
