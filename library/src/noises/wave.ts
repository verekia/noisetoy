// Wave noise — an original experiment for this repo, built for looks.
//
// Each lattice corner emits a random plane wave: a hashed direction and phase,
// with a fixed frequency of two wavelengths per cell. The four (2D) or eight
// (3D) corner waves are blended with the quintic fade, so the local stripe
// orientation rotates smoothly from cell to cell — an oriented interference
// pattern with a fingerprint/moire character.
//
// Related in spirit to Gabor/phasor noise (sparse oriented waves), but using
// lattice blending instead of kernel summation, which keeps it as cheap as
// gradient noise. Output is a blend of cosines, so it is bounded in [-1, 1]
// with no empirical calibration needed. Original implementation (MIT).

import { fade, hash2, hash3, hashU32, lerp, to01 } from './common.js'

const TAU = 6.283185307179586

/** Two full wavelengths per lattice cell. */
export const WAVE_FREQ = 12.566370614359172 // 4 * pi

const corner2 = (h: number, dx: number, dy: number): number => {
  const a = to01(h) * TAU
  const ph = to01(hashU32(h)) * TAU
  return Math.cos((Math.cos(a) * dx + Math.sin(a) * dy) * WAVE_FREQ + ph)
}

const corner3 = (h: number, dx: number, dy: number, dz: number): number => {
  const kz = to01(h) * 2 - 1
  const h2 = hashU32(h)
  const a = to01(h2) * TAU
  const ph = to01(hashU32(h2)) * TAU
  const r = Math.sqrt(Math.max(0, 1 - kz * kz))
  return Math.cos((r * Math.cos(a) * dx + r * Math.sin(a) * dy + kz * dz) * WAVE_FREQ + ph)
}

export const wave2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const s00 = corner2(hash2(ix, iy), fx, fy)
  const s10 = corner2(hash2(ix + 1, iy), fx - 1, fy)
  const s01 = corner2(hash2(ix, iy + 1), fx, fy - 1)
  const s11 = corner2(hash2(ix + 1, iy + 1), fx - 1, fy - 1)
  return lerp(lerp(s00, s10, ux), lerp(s01, s11, ux), uy)
}

export const wave3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const s000 = corner3(hash3(ix, iy, iz), fx, fy, fz)
  const s100 = corner3(hash3(ix + 1, iy, iz), fx - 1, fy, fz)
  const s010 = corner3(hash3(ix, iy + 1, iz), fx, fy - 1, fz)
  const s110 = corner3(hash3(ix + 1, iy + 1, iz), fx - 1, fy - 1, fz)
  const s001 = corner3(hash3(ix, iy, iz + 1), fx, fy, fz - 1)
  const s101 = corner3(hash3(ix + 1, iy, iz + 1), fx - 1, fy, fz - 1)
  const s011 = corner3(hash3(ix, iy + 1, iz + 1), fx, fy - 1, fz - 1)
  const s111 = corner3(hash3(ix + 1, iy + 1, iz + 1), fx - 1, fy - 1, fz - 1)
  const nz0 = lerp(lerp(s000, s100, ux), lerp(s010, s110, ux), uy)
  const nz1 = lerp(lerp(s001, s101, ux), lerp(s011, s111, ux), uy)
  return lerp(nz0, nz1, uz)
}

/** Wave 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const wave2dCanonical = (x: number, y: number): number => 0.5 + 0.5 * wave2(x, y)

/** Wave 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const wave3dCanonical = (x: number, y: number, z: number): number => 0.5 + 0.5 * wave3(x, y, z)
