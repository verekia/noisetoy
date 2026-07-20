// Vortex noise — an original experiment for this repo.
//
// Each lattice corner gets a hashed unit vector; the vectors are blended with
// the quintic fade and the *angle* of the blended vector is displayed as
// cos(2 * theta). Where neighboring vectors oppose, the blended vector passes
// near zero length and the angle winds around a singularity — smooth swirling
// bands punctuated by pinwheel vortices.
//
// Provenance / disclosure: the lattice + quintic fade structure follows Ken
// Perlin's classic noise (1985/2002, unpatented); reading the angle of a
// blended random vector field appears to be original. Related to vector-field
// visualization folklore. MIT.

import { fade, hash2, hash3, hashU32, to01 } from './common'

const TAU = 6.283185307179586

export const vortex2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  let sx = 0
  let sy = 0
  for (let cy = 0; cy <= 1; cy++) {
    for (let cx = 0; cx <= 1; cx++) {
      const a = to01(hash2(ix + cx, iy + cy)) * TAU
      const w = (cx === 0 ? 1 - ux : ux) * (cy === 0 ? 1 - uy : uy)
      sx += w * Math.cos(a)
      sy += w * Math.sin(a)
    }
  }
  const theta = Math.atan2(sy, sx)
  return Math.cos(2 * theta)
}

export const vortex3 = (x: number, y: number, z: number): number => {
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
        const h = hash3(ix + cx, iy + cy, iz + cz)
        const kz = to01(h) * 2 - 1
        const a = to01(hashU32(h)) * TAU
        const r = Math.sqrt(Math.max(0, 1 - kz * kz))
        const w = (cx === 0 ? 1 - ux : ux) * (cy === 0 ? 1 - uy : uy) * (cz === 0 ? 1 - uz : uz)
        sx += w * r * Math.cos(a)
        sy += w * r * Math.sin(a)
      }
    }
  }
  const theta = Math.atan2(sy, sx)
  return Math.cos(2 * theta)
}
