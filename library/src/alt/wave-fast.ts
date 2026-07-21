// Wave noise tuned for CPU throughput — a candidate faster implementation of
// the same construction as noises/wave.ts: a random plane wave per lattice
// corner (hashed direction and phase, fixed frequency), quintic-blended.
//
// The wave cosine itself is irreducible — it IS the signal — but everything
// around it is not. Shipping spends per 2D corner: two chained lowbias32
// avalanches, a cos and a sin to build the direction, and a third avalanche
// for the phase, before the one cosine that matters. Here a corner costs ONE
// mix (the validated fib1 shape in 2D, full lowbias32 in 3D — see
// worley-fast.ts for why they differ) and the direction comes from a table
// of SIXTY-FOUR unit directions at 5.625-degree steps (top 6 bits). Vortex
// needed only 16 directions, but wave DISPLAYS the direction as the local
// stripe orientation, so it gets the finer table; at 64 steps the
// orientation quantum is under the angular change across a single cell in a
// typical render. The phase quantizes to 256 steps, the same grid the ripple
// candidate uses. In 3D the polar component keeps the shipping construction
// (kz uniform, one sqrt for the equatorial radius) with kz read from 10
// bits.
//
// The FIELD is a different draw from the shipping one — different hash, same
// distribution: mean/rms/extrema match shipping to two decimals over 2M
// samples. Measured with `bun run bench:impl`: ~2.5x the shipping wave2 and
// ~2.0x wave3 on the CPU. Output is a blend of cosines in [-1, 1], as
// shipping.

import { fade, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../noises/common'
import { WAVE_FREQ } from '../noises/wave'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV10 = 1 / 1024
const TAU = 6.283185307179586
const PHASE_SCALE = TAU / 256

const NDIR = 64
const DIRX = new Float64Array(NDIR)
const DIRY = new Float64Array(NDIR)
for (let i = 0; i < NDIR; i++) {
  DIRX[i] = Math.cos((i * TAU) / NDIR)
  DIRY[i] = Math.sin((i * TAU) / NDIR)
}

export const waveFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  let s = x0 + y0
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const s00 = Math.cos(
    ((DIRX[h >>> 26] as number) * fx + (DIRY[h >>> 26] as number) * fy) * WAVE_FREQ + ((h >>> 18) & 255) * PHASE_SCALE,
  )
  s = x1 + y0
  h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const s10 = Math.cos(
    ((DIRX[h >>> 26] as number) * (fx - 1) + (DIRY[h >>> 26] as number) * fy) * WAVE_FREQ +
      ((h >>> 18) & 255) * PHASE_SCALE,
  )
  s = x0 + y1
  h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const s01 = Math.cos(
    ((DIRX[h >>> 26] as number) * fx + (DIRY[h >>> 26] as number) * (fy - 1)) * WAVE_FREQ +
      ((h >>> 18) & 255) * PHASE_SCALE,
  )
  s = x1 + y1
  h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const s11 = Math.cos(
    ((DIRX[h >>> 26] as number) * (fx - 1) + (DIRY[h >>> 26] as number) * (fy - 1)) * WAVE_FREQ +
      ((h >>> 18) & 255) * PHASE_SCALE,
  )
  return lerp(lerp(s00, s10, ux), lerp(s01, s11, ux), uy)
}

const corner3 = (s: number, dx: number, dy: number, dz: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  const kz = (h >>> 22) * INV10 * 2 - 1
  const i = (h >>> 16) & 63
  const r = Math.sqrt(1 - kz * kz)
  return Math.cos(
    (r * (DIRX[i] as number) * dx + r * (DIRY[i] as number) * dy + kz * dz) * WAVE_FREQ +
      ((h >>> 8) & 255) * PHASE_SCALE,
  )
}

export const waveFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const z1 = (z0 + LATTICE_HZ) | 0
  const s000 = corner3(x0 + y0 + z0, fx, fy, fz)
  const s100 = corner3(x1 + y0 + z0, fx - 1, fy, fz)
  const s010 = corner3(x0 + y1 + z0, fx, fy - 1, fz)
  const s110 = corner3(x1 + y1 + z0, fx - 1, fy - 1, fz)
  const s001 = corner3(x0 + y0 + z1, fx, fy, fz - 1)
  const s101 = corner3(x1 + y0 + z1, fx - 1, fy, fz - 1)
  const s011 = corner3(x0 + y1 + z1, fx, fy - 1, fz - 1)
  const s111 = corner3(x1 + y1 + z1, fx - 1, fy - 1, fz - 1)
  const nz0 = lerp(lerp(s000, s100, ux), lerp(s010, s110, ux), uy)
  const nz1 = lerp(lerp(s001, s101, ux), lerp(s011, s111, ux), uy)
  return lerp(nz0, nz1, uz)
}
