// Tileable wave noise. Same corner-wave blending as wave.ts, but the lattice
// coordinates used to hash each corner's wave direction and phase are wrapped
// modulo the period in x/y. Wave arguments stay relative to the corner, so
// they are translation-invariant and the pattern repeats seamlessly.
// This wrapping is deliberately kept out of the core implementation.

import { fade, hash2, hash3, hashU32, imod, lerp, to01 } from '../common.js'
import { WAVE_FREQ } from '../wave.js'

const TAU = 6.283185307179586

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

export const wave2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const x0 = imod(ix, px)
  const x1 = imod(ix + 1, px)
  const y0 = imod(iy, py)
  const y1 = imod(iy + 1, py)
  const s00 = corner2(hash2(x0, y0), fx, fy)
  const s10 = corner2(hash2(x1, y0), fx - 1, fy)
  const s01 = corner2(hash2(x0, y1), fx, fy - 1)
  const s11 = corner2(hash2(x1, y1), fx - 1, fy - 1)
  return lerp(lerp(s00, s10, ux), lerp(s01, s11, ux), uy)
}

export const wave3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = imod(ix, px)
  const x1 = imod(ix + 1, px)
  const y0 = imod(iy, py)
  const y1 = imod(iy + 1, py)
  const s000 = corner3(hash3(x0, y0, iz), fx, fy, fz)
  const s100 = corner3(hash3(x1, y0, iz), fx - 1, fy, fz)
  const s010 = corner3(hash3(x0, y1, iz), fx, fy - 1, fz)
  const s110 = corner3(hash3(x1, y1, iz), fx - 1, fy - 1, fz)
  const s001 = corner3(hash3(x0, y0, iz + 1), fx, fy, fz - 1)
  const s101 = corner3(hash3(x1, y0, iz + 1), fx - 1, fy, fz - 1)
  const s011 = corner3(hash3(x0, y1, iz + 1), fx, fy - 1, fz - 1)
  const s111 = corner3(hash3(x1, y1, iz + 1), fx - 1, fy - 1, fz - 1)
  const nz0 = lerp(lerp(s000, s100, ux), lerp(s010, s110, ux), uy)
  const nz1 = lerp(lerp(s001, s101, ux), lerp(s011, s111, ux), uy)
  return lerp(nz0, nz1, uz)
}

/** Wave 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const wave2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * wave2Tileable(x, y, periodX, periodY)

/** Wave 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const wave3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * wave3Tileable(x, y, z, periodX, periodY)
