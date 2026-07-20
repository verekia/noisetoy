// Ripple noise — an original experiment for this repo, built for looks.
//
// Worley-style feature points, but instead of taking the nearest distance,
// every point in the 3x3 (2D) / 3x3x3 (3D) neighborhood emits a radial wave
// cos(dist * freq - phase) with a smooth quadratic window so contributions
// vanish before leaving the searched neighborhood. Overlapping wavefronts
// interfere like water drops; in 3D, moving the z slice makes rings bloom and
// fade as sources pass through the slice.
//
// A sparse-convolution noise with a radial cosine kernel; related to Worley
// (point set) and Gabor noise (kernel sum). Original implementation (MIT).

import { hash2, hash3, hashU32, to01 } from './common'

const TAU = 6.283185307179586

/** Radians per lattice unit: ~2.4 rings per cell. */
export const RIPPLE_FREQ = 15
/** Window radius in lattice units; contributions reach zero here. */
export const RIPPLE_RANGE = 1.5

export const ripple2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
      const h2 = hashU32(h)
      const ox = to01(h)
      const oy = to01(h2)
      const ph = to01(hashU32(h2)) * TAU
      const vx = dx + ox - fx
      const vy = dy + oy - fy
      const d = Math.sqrt(vx * vx + vy * vy)
      const w = Math.max(0, 1 - d / RIPPLE_RANGE)
      sum += w * w * Math.cos(d * RIPPLE_FREQ - ph)
    }
  }
  return sum
}

export const ripple3 = (x: number, y: number, z: number): number => {
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
        const h = hash3(ix + dx, iy + dy, iz + dz)
        const h2 = hashU32(h)
        const h3 = hashU32(h2)
        const ox = to01(h)
        const oy = to01(h2)
        const oz = to01(h3)
        const ph = to01(hashU32(h3)) * TAU
        const vx = dx + ox - fx
        const vy = dy + oy - fy
        const vz = dz + oz - fz
        const d = Math.sqrt(vx * vx + vy * vy + vz * vz)
        const w = Math.max(0, 1 - d / RIPPLE_RANGE)
        sum += w * w * Math.cos(d * RIPPLE_FREQ - ph)
      }
    }
  }
  return sum
}
