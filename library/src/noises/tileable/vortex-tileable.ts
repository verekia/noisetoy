// Tileable vortex noise: corner hash coordinates wrapped modulo the period in
// x/y before hashing, same blending as vortex.ts.
// Kept out of the core implementation.

import { fade, hash2, hash3, hashU32, imod, to01 } from '../common'

const TAU = 6.283185307179586

export const vortex2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  let sx = 0
  let sy = 0
  for (let cy = 0; cy <= 1; cy++) {
    for (let cx = 0; cx <= 1; cx++) {
      const a = to01(hash2(imod(ix + cx, px), imod(iy + cy, py))) * TAU
      const w = (cx === 0 ? 1 - ux : ux) * (cy === 0 ? 1 - uy : uy)
      sx += w * Math.cos(a)
      sy += w * Math.sin(a)
    }
  }
  return Math.cos(2 * Math.atan2(sy, sx))
}

export const vortex3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  const uz = fade(z - iz)
  let sx = 0
  let sy = 0
  for (let cz = 0; cz <= 1; cz++) {
    for (let cy = 0; cy <= 1; cy++) {
      for (let cx = 0; cx <= 1; cx++) {
        const h = hash3(imod(ix + cx, px), imod(iy + cy, py), iz + cz)
        const kz = to01(h) * 2 - 1
        const a = to01(hashU32(h)) * TAU
        const r = Math.sqrt(Math.max(0, 1 - kz * kz))
        const w = (cx === 0 ? 1 - ux : ux) * (cy === 0 ? 1 - uy : uy) * (cz === 0 ? 1 - uz : uz)
        sx += w * r * Math.cos(a)
        sy += w * r * Math.sin(a)
      }
    }
  }
  return Math.cos(2 * Math.atan2(sy, sx))
}
