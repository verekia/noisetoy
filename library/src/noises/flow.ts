// Flow noise, after Ken Perlin and Fabrice Neyret, "Flow Noise" (SIGGRAPH 2001
// technical sketch). Ordinary gradient noise on a 2D lattice, except that every
// corner gradient ROTATES as the third input advances. Where the z axis of 3D
// Perlin slides through a static volume — features fade in and out — rotating
// gradients make the field churn in place, which reads as swirling flow.
// Original implementation (MIT); no known patent covers the technique.
//
// `p.z` is therefore a rotation phase, not a third spatial axis. The sketch is
// 2D-only, which is why this is a 2D lattice driven by a phase rather than a 3D
// field.
//
// DEVIATION, deliberately flagged: each corner here turns at its OWN integer
// rate k in {-2, -1, 1, 2}, and neither reference does that. Perlin & Neyret
// rotate every gradient in an octave by the same angle, and the uniformity is
// load-bearing — it is what keeps the gradients decorrelated so each frame
// still looks like Perlin noise; their only rate variation is per octave, with
// finer noise rotating faster. Gustavson & McEwan (2022) later give each
// gradient its own rotation AXIS for the 3D case, but keep the angle common and
// note they are knowingly abandoning that constraint to do it. Varying the rate
// goes further than either.
//
// The reason: a single shared rate makes the field at phase 0.5 the exact
// negative of the field at phase 0, which reads as a breathing inversion rather
// than as flow. Integer rates also keep the field exactly periodic in z with
// period 1, so the animation loops — at the renderer's Z_SPEED of 0.25, a
// four-second loop. What this costs in gradient correlation has not been
// measured; a shared-rate implementation would be the thing to compare against.
//
// The sketch's second ingredient, pseudo-advection, is not implemented: it
// warps each scale by the accumulated turbulence of the coarser scales, which
// needs state a self-contained `sample(x, y, z)` does not have.
//
// Output matches 2D Perlin's range, so it reuses PERLIN2_NORM.

import { fade, hash2, hashU32, lerp, to01 } from './common'

const TAU = 6.283185307179586

/**
 * Dot of a rotating hash-derived unit gradient with (dx, dy). The gradient's
 * rest angle and its rotation rate come from two independent hashes.
 */
export const rotGradDot2 = (h: number, phase: number, dx: number, dy: number): number => {
  const b = hashU32(h) & 3
  const k = (1 + (b >> 1)) * (1 - 2 * (b & 1))
  const a = to01(h) * TAU + k * phase
  return Math.cos(a) * dx + Math.sin(a) * dy
}

export const flow3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const ph = z * TAU
  const n00 = rotGradDot2(hash2(ix, iy), ph, fx, fy)
  const n10 = rotGradDot2(hash2(ix + 1, iy), ph, fx - 1, fy)
  const n01 = rotGradDot2(hash2(ix, iy + 1), ph, fx, fy - 1)
  const n11 = rotGradDot2(hash2(ix + 1, iy + 1), ph, fx - 1, fy - 1)
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}
