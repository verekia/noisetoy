// Tileable Truchet noise: the cell orientation hash is wrapped modulo the
// period in x/y; the arc geometry is per-cell and translation-invariant.
// Kept out of the core implementation.

import { hash2, imod } from '../common'
import { TRUCHET_RINGS } from '../truchet'

const TAU = 6.283185307179586

export const truchet2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  const fy = y - iy
  if ((hash2(imod(ix, px), imod(iy, py)) & 1) === 1) fx = 1 - fx
  const d1 = Math.abs(Math.sqrt(fx * fx + fy * fy) - 0.5)
  const gx = fx - 1
  const gy = fy - 1
  const d2 = Math.abs(Math.sqrt(gx * gx + gy * gy) - 0.5)
  return Math.cos(Math.min(d1, d2) * TAU * TRUCHET_RINGS)
}
