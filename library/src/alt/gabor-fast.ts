// Gabor noise tuned for CPU throughput — a candidate faster implementation
// of the same sparse-convolution construction as noises/gabor.ts: one Gabor
// kernel (Gaussian envelope times a harmonic) per lattice cell, summed over
// the 3x3 / 3x3x3 neighbourhood.
//
// Shipping spends SIX chained lowbias32 avalanches per 2D cell (nine in 3D)
// plus a cos and a sin inside gradDot for the orientation, before the exp
// and cos every kernel inherently costs. Three changes:
//
// 1. ONE MIX PER CELL for the impulse position (fib1 in 2D, lowbias32 in 3D
//    — see worley-fast.ts), split 16+16 / 10+10+10 bits exactly as the
//    worley candidate does, plus ONE cheap remix (multiply by 2^32/phi) for
//    the kernel parameters: weight and phase from 8 bits each, orientation
//    from a table of 64 unit directions (5.625-degree steps; in 3D, 64
//    azimuths times 64 polar levels). The shipping orientation is already
//    effectively quantized by float precision at display scale — 64 steps
//    is indistinguishable in the summed field.
//
// 2. KERNELS THAT CANNOT CONTRIBUTE ARE DROPPED before their exp and cos:
//    at squared distance 2.25 the envelope is exp(-pi * 2.25) ~ 8.5e-4,
//    which is the shipping algorithm's OWN containment bound — the 3x3
//    neighbourhood is argued correct in noises/gabor.ts precisely because
//    the kernel is below ~8e-4 beyond |d| = 1.5. The gate applies that
//    bound uniformly instead of only at the neighbourhood edge. This is
//    where most of the 3D win comes from: the corner cells of the 3x3x3
//    block usually sit beyond the cutoff, so most of the 27 exp/cos pairs
//    never execute.
//
// 3. The envelope exp and harmonic cos remain untouched — they are the
//    band-limited construction itself.
//
// The FIELD is a different draw from the shipping one — different hash, same
// distribution: mean/rms match shipping to two decimals over 2M samples.
// Measured with `bun run bench:impl`: ~2.7x the shipping gabor2 and ~3.4x
// gabor3 on the CPU.

import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common.js'
import { GABOR_ENVELOPE, GABOR_FREQ } from '../noises/gabor.js'
import { GABOR2_NORM, GABOR3_NORM } from '../noises/normalization.js'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV10 = 1 / 1024
const INV8 = 1 / 256
const TAU = 6.283185307179586
const PHASE_SCALE = TAU / 256
/** 2*pi*GABOR_FREQ, the harmonic frequency in radians per cell. */
const HARM = TAU * GABOR_FREQ
/** exp(-pi * 2.25) ~ 8.5e-4 — the shipping 3x3 containment bound. */
const GABOR_CUT2 = 2.25

const NDIR = 64
const DIRX = new Float64Array(NDIR)
const DIRY = new Float64Array(NDIR)
for (let i = 0; i < NDIR; i++) {
  DIRX[i] = Math.cos((i * TAU) / NDIR)
  DIRY[i] = Math.sin((i * TAU) / NDIR)
}

export const gaborFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    const yh = (yc + Math.imul(dy, LATTICE_HY)) | 0
    for (let dx = -1; dx <= 1; dx++) {
      const s = (xc + Math.imul(dx, LATTICE_HX) + yh) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = dx + (h >>> 16) * INV16 - fx
      const vy = dy + (h & 0xffff) * INV16 - fy
      const d2 = vx * vx + vy * vy
      if (d2 >= GABOR_CUT2) continue
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      const w = ((bh >>> 10) & 255) * INV8 * 2 - 1
      const ph = ((bh >>> 18) & 255) * PHASE_SCALE
      const i = bh >>> 26
      const proj = (DIRX[i] as number) * vx + (DIRY[i] as number) * vy
      sum += w * Math.exp(-GABOR_ENVELOPE * d2) * Math.cos(HARM * proj + ph)
    }
  }
  return sum
}

export const gaborFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const zc = Math.imul(iz, LATTICE_HZ)
  let sum = 0
  for (let dz = -1; dz <= 1; dz++) {
    const zh = (zc + Math.imul(dz, LATTICE_HZ)) | 0
    for (let dy = -1; dy <= 1; dy++) {
      const yh = (yc + Math.imul(dy, LATTICE_HY) + zh) | 0
      for (let dx = -1; dx <= 1; dx++) {
        const s = (xc + Math.imul(dx, LATTICE_HX) + yh) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = dx + (h >>> 22) * INV10 - fx
        const vy = dy + ((h >>> 12) & 1023) * INV10 - fy
        const vz = dz + ((h >>> 2) & 1023) * INV10 - fz
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 >= GABOR_CUT2) continue
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        const w = ((bh >>> 2) & 255) * INV8 * 2 - 1
        const ph = ((bh >>> 10) & 255) * PHASE_SCALE
        const i = (bh >>> 20) & 63
        // 64 polar levels, offset half a step so kz never reaches +-1.
        const kz = (bh >>> 26) * (1 / 32) - 0.984375
        const r = Math.sqrt(1 - kz * kz)
        const proj = r * (DIRX[i] as number) * vx + r * (DIRY[i] as number) * vy + kz * vz
        sum += w * Math.exp(-GABOR_ENVELOPE * d2) * Math.cos(HARM * proj + ph)
      }
    }
  }
  return sum
}

/** Gabor 2D, 'split-bits-gated' fast implementation — display value, unclamped. */
export const gabor2dFast = (x: number, y: number): number => 0.5 + 0.5 * GABOR2_NORM * gaborFast2(x, y)

/** Gabor 3D, 'split-bits-gated' fast implementation — display value, unclamped. */
export const gabor3dFast = (x: number, y: number, z: number): number => 0.5 + 0.5 * GABOR3_NORM * gaborFast3(x, y, z)
