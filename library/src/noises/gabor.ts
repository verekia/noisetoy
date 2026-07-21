// Gabor noise, after Ares Lagae, Sylvain Lefebvre, George Drettakis and Philip
// Dutre, "Procedural Noise using Sparse Gabor Convolution" (SIGGRAPH 2009).
// Original implementation (MIT); no known patent covers the technique.
//
// A sparse convolution noise whose kernel is a Gabor function — a Gaussian
// envelope times a harmonic:
//
//   g(d) = w * exp(-pi * a^2 * |d|^2) * cos(2*pi * F0 * (d . omega) + phi)
//
// One impulse per lattice cell (Lagae et al. scatter impulses by a Poisson
// process; one per cell is the standard cheap substitute, as in Worley), summed
// over the 3x3 / 3x3x3 neighbourhood with hashed weight w, orientation omega
// and phase phi.
//
// What distinguishes it from the other oscillatory noises here is that it is
// BAND-LIMITED by construction: the envelope width `a` and the harmonic
// frequency `F0` set the bandwidth and the centre frequency of the power
// spectrum directly, which is what lets Gabor noise be filtered analytically.
// Wave, by contrast, blends corner plane waves on a lattice — cheaper, but its
// spectrum is whatever the lattice gives it. Randomising phi is what makes this
// noise rather than a repeating texture.
//
// Cost: this is the most expensive basis in the repo, roughly 9 hashes per cell
// against Worley's 3, plus an exp and a cos. That is inherent to sparse
// convolution and is why the paper leans on precomputation.

import { gradDot2, gradDot3, hash2, hash3, hashU32, to01 } from './common.js'
import { GABOR2_NORM, GABOR3_NORM } from './normalization.js'

const TAU = 6.283185307179586

/**
 * Gaussian envelope coefficient pi * a^2, at a bandwidth of a = 1. At |d| = 1.5
 * the kernel is down to ~8e-4, so the 3x3 (2D) / 3x3x3 (3D) neighbourhood
 * contains it and no windowing correction is needed.
 */
export const GABOR_ENVELOPE = 3.141592653589793

/** Harmonic frequency F0, in cycles per lattice cell. */
export const GABOR_FREQ = 2

export const gabor2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
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

export const gabor3 = (x: number, y: number, z: number): number => {
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

/** Gabor 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const gabor2dCanonical = (x: number, y: number): number => 0.5 + 0.5 * GABOR2_NORM * gabor2(x, y)

/** Gabor 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const gabor3dCanonical = (x: number, y: number, z: number): number => 0.5 + 0.5 * GABOR3_NORM * gabor3(x, y, z)
