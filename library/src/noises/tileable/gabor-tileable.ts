// Tileable Gabor noise. As in worley-tileable.ts, the cell coordinates used to
// hash each impulse are wrapped modulo an integer period in x and y; the kernel
// geometry stays unwrapped, so the sum is unchanged away from the seam.
// This wrapping is deliberately kept out of the core implementation.

import { gradDot2, gradDot3, hash2, hash3, hashU32, imod, to01 } from '../common'
import { GABOR_ENVELOPE, GABOR_FREQ } from '../gabor'

const TAU = 6.283185307179586

export const gabor2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const h2 = hashU32(h)
      const h3 = hashU32(h2)
      const h4 = hashU32(h3)
      const vx = dx + to01(h) - fx
      const vy = dy + to01(h2) - fy
      const ph = to01(h3) * TAU
      const w = to01(h4) * 2 - 1
      const d2 = vx * vx + vy * vy
      const proj = gradDot2(hashU32(h4), vx, vy)
      sum += w * Math.exp(-GABOR_ENVELOPE * d2) * Math.cos(TAU * GABOR_FREQ * proj + ph)
    }
  }
  return sum
}

export const gabor3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let sum = 0
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const h3 = hashU32(h2)
        const h4 = hashU32(h3)
        const h5 = hashU32(h4)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(h3) - fz
        const ph = to01(h4) * TAU
        const w = to01(h5) * 2 - 1
        const d2 = vx * vx + vy * vy + vz * vz
        const proj = gradDot3(hashU32(h5), vx, vy, vz)
        sum += w * Math.exp(-GABOR_ENVELOPE * d2) * Math.cos(TAU * GABOR_FREQ * proj + ph)
      }
    }
  }
  return sum
}
