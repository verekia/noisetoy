// Flow noise tuned for CPU throughput — a candidate implementation of the
// same construction as noises/flow.ts: a 2D gradient lattice whose corner
// gradients rotate as the phase input advances, each at its own integer rate
// in {-2, -1, 1, 2}, keeping the exact z-period of 1. Two changes:
//
// 1. TWO TRIG CALLS PER SAMPLE INSTEAD OF EIGHT. The shipping code computes
//    cos and sin of (restAngle + rate * phase) per corner. But the rotation
//    phase is SHARED — only the rest angle and the rate differ per corner —
//    so rotate by identities instead: compute cos/sin of the phase once,
//    derive the rate-2 pair by the double-angle identities (c2 = c1^2 - s1^2,
//    s2 = 2 s1 c1), flip the sign of sin for negative rates, and express each
//    corner's dot with the rotated gradient as
//        ck * (g . d) + sk * (g x d)
//    where g is the corner's REST direction. No per-corner trigonometry.
//
// 2. DISCRETE REST DIRECTIONS. For that factorization to be trig-free, the
//    rest direction g has to come from constants: the eight unit directions
//    at 45-degree steps (axes and normalized diagonals), selected from the
//    top 3 bits of the corner mix, against the shipping continuous
//    to01(hash) * TAU angle. Quantized rest angles are the same trade every
//    table-gradient noise in this repo already makes — the shipping perlin2
//    de facto draws 4 directions — and here the rotation sweeps them through
//    all angles anyway, so no direction is ever privileged over a cycle.
//    Rate bits move from a SECOND full avalanche (shipping hashes twice per
//    corner, plus once inside hash2) to bits 27-28 of the same mix.
//
// The corner mix is the Perlin candidate's validated 2D scheme: per-corner
// products folded with the lattice constants, the x side pre-mixed once
// (rx = x0 ^ (x0 >>> 16)), one multiply by 2^32/phi per corner, everything
// read from the top bits. Flow consumes 5 top bits (3 direction + 2 rate), so
// the battery was re-run at 32 slots: marginal chi-square 33.1 against a
// 31-df critical of 45, joints at +x/+y/+xy 1005-1057 against a 1023-df
// critical of 1098, over 1.2M corners.
//
// The corner logic is written out longhand in the sampler rather than through
// a helper: with a 7-argument helper the timing was bimodal (194 ms or
// 318 ms depending on the run — the same fragile JIT inlining the Worley
// candidate hit); inlined it sits stably at ~183 ms.
//
// Field statistics match the shipping flow at every phase tested (rms 0.216
// both, mean ~0, extrema +-0.70 at z = 0, 0.13, 0.5); the z-period of
// exactly 1 is preserved to 7e-16. The FIELD is a different draw — different
// hash, quantized rest angles — with the same rate distribution, so the
// churning character and the four-second loop are unchanged.
//
// Measured with `bun run bench:impl`: ~2.1x the shipping flow3 on the CPU,
// best and median agreeing across runs. GLSL/WGSL/TSL counterparts live in
// flow-fast.{glsl,wgsl,tsl}.ts and ship through ALT_VARIANTS; on the GPU,
// where trigonometry is far cheaper relative to integer work, expect the
// margin to shrink — measure before believing anything there.
//
// Output matches noises/flow.ts's range (unit gradients), so the same
// PERLIN2_NORM display mapping applies.

import { fade, LATTICE_HX, LATTICE_HY, lerp } from '../noises/common.js'
import { PERLIN2_NORM } from '../noises/normalization.js'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const TAU = 6.283185307179586
/** sqrt(2) / 2 — unit-length diagonals. */
const S = 0.7071067811865476

export const flowFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fade(fx)
  const uy = fade(fy)
  const ph = z * TAU
  const c1 = Math.cos(ph)
  const s1 = Math.sin(ph)
  const c2 = c1 * c1 - s1 * s1
  const s2 = 2 * s1 * c1
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const rx0 = x0 ^ (x0 >>> 16)
  const rx1 = x1 ^ (x1 >>> 16)
  let n00: number
  let n10: number
  let n01: number
  let n11: number
  // Per corner: dir = top 3 bits -> one of 8 unit rest directions; bit 28 is
  // the rate magnitude (1 or 2), bit 27 its sign — the same k mapping as the
  // shipping rotGradDot2, read from one mix instead of a second avalanche.
  {
    const h = Math.imul(rx0 ^ y0, FIB)
    const dir = h >>> 29
    const gx = dir === 0 ? 1 : dir === 4 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 7 ? S : -S
    const gy = dir === 2 ? 1 : dir === 6 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 3 ? S : -S
    const p = gx * fx + gy * fy
    const q = gx * fy - gy * fx
    const ck = (h & 0x10000000) === 0 ? c1 : c2
    const sk = (h & 0x10000000) === 0 ? s1 : s2
    n00 = ck * p + ((h & 0x08000000) === 0 ? sk : -sk) * q
  }
  {
    const h = Math.imul(rx1 ^ y0, FIB)
    const dir = h >>> 29
    const dx = fx - 1
    const gx = dir === 0 ? 1 : dir === 4 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 7 ? S : -S
    const gy = dir === 2 ? 1 : dir === 6 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 3 ? S : -S
    const p = gx * dx + gy * fy
    const q = gx * fy - gy * dx
    const ck = (h & 0x10000000) === 0 ? c1 : c2
    const sk = (h & 0x10000000) === 0 ? s1 : s2
    n10 = ck * p + ((h & 0x08000000) === 0 ? sk : -sk) * q
  }
  {
    const h = Math.imul(rx0 ^ y1, FIB)
    const dir = h >>> 29
    const dy = fy - 1
    const gx = dir === 0 ? 1 : dir === 4 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 7 ? S : -S
    const gy = dir === 2 ? 1 : dir === 6 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 3 ? S : -S
    const p = gx * fx + gy * dy
    const q = gx * dy - gy * fx
    const ck = (h & 0x10000000) === 0 ? c1 : c2
    const sk = (h & 0x10000000) === 0 ? s1 : s2
    n01 = ck * p + ((h & 0x08000000) === 0 ? sk : -sk) * q
  }
  {
    const h = Math.imul(rx1 ^ y1, FIB)
    const dir = h >>> 29
    const dx = fx - 1
    const dy = fy - 1
    const gx = dir === 0 ? 1 : dir === 4 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 7 ? S : -S
    const gy = dir === 2 ? 1 : dir === 6 ? -1 : (dir & 1) === 0 ? 0 : dir === 1 || dir === 3 ? S : -S
    const p = gx * dx + gy * dy
    const q = gx * dy - gy * dx
    const ck = (h & 0x10000000) === 0 ? c1 : c2
    const sk = (h & 0x10000000) === 0 ? s1 : s2
    n11 = ck * p + ((h & 0x08000000) === 0 ? sk : -sk) * q
  }
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy)
}

/** Flow 3D, 'fast-rot' fast implementation — display value, unclamped. */
export const flow3dFast = (x: number, y: number, z: number): number => 0.5 + 0.5 * PERLIN2_NORM * flowFast3(x, y, z)
