// Tileable 2D simplex-value noise via the 4D torus trick, mirroring
// simplex-tileable.ts: the tile domain is mapped onto a torus in 4D and a 4D
// simplex-value noise (rank-ordered corners, value contributions, 0.6 kernel
// radius as in simplex4) is sampled there. Self-contained so it can be
// composed without the gradient-based simplex4 sources.
// This trickery is deliberately kept out of the core implementation.

import { hash4, to01 } from '../common'

const TAU = 6.283185307179586
const F4 = 0.30901699437494745 // (sqrt(5) - 1) / 4
const G4 = 0.1381966011250105 // (5 - sqrt(5)) / 20

const contribV4 = (dx: number, dy: number, dz: number, dw: number, h: number): number => {
  let t = 0.6 - dx * dx - dy * dy - dz * dz - dw * dw
  if (t <= 0) return 0
  t *= t
  return t * t * (to01(h) * 2 - 1)
}

const simplexValue4 = (x: number, y: number, z: number, w: number): number => {
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
  return (
    contribV4(x0, y0, z0, w0, hash4(i, j, k, l)) +
    contribV4(x0 - i1 + G4, y0 - j1 + G4, z0 - k1 + G4, w0 - l1 + G4, hash4(i + i1, j + j1, k + k1, l + l1)) +
    contribV4(
      x0 - i2 + 2 * G4,
      y0 - j2 + 2 * G4,
      z0 - k2 + 2 * G4,
      w0 - l2 + 2 * G4,
      hash4(i + i2, j + j2, k + k2, l + l2),
    ) +
    contribV4(
      x0 - i3 + 3 * G4,
      y0 - j3 + 3 * G4,
      z0 - k3 + 3 * G4,
      w0 - l3 + 3 * G4,
      hash4(i + i3, j + j3, k + k3, l + l3),
    ) +
    contribV4(x0 - 1 + 4 * G4, y0 - 1 + 4 * G4, z0 - 1 + 4 * G4, w0 - 1 + 4 * G4, hash4(i + 1, j + 1, k + 1, l + 1))
  )
}

export const simplexValue2TileableTorus = (x: number, y: number, px: number, py: number): number => {
  const ax = (x / px) * TAU
  const ay = (y / py) * TAU
  const rx = px / TAU
  const ry = py / TAU
  return simplexValue4(rx * Math.cos(ax), rx * Math.sin(ax), ry * Math.cos(ay), ry * Math.sin(ay))
}
