// Manhattan and Chebyshev Worley tuned for CPU throughput — candidate
// implementations of the same algorithms as noises/worley-metrics.ts, built
// on the same two changes as the Euclidean candidate in worley-fast.ts:
//
// 1. ONE HASH PER CELL. All of a cell's offsets come out of one 32-bit hash
//    (16+16 bits in 2D via the validated two-axis mix, 10+10+10 in 3D via the
//    full lowbias32 shape) instead of the shipping three to five chained
//    avalanches. Same quantization trade as worley-fast.ts: 2^-16 / 2^-10 of
//    a cell, far below a pixel.
//
// 2. METRIC-CORRECT PRUNING. Centre column/plane first, neighbours only if
//    their boundary distance still beats the current F1 — except the bound
//    composes per metric: for L1 a diagonal column's minimum distance is the
//    SUM of the axis clearances (|vx| + |vy| >= colDist + planeDist), for
//    Linf it is their MAX. Both are conservative, so the result is exactly
//    the unpruned minimum; verified against unpruned references with the
//    same hash (zero mismatches over 400k probes each).
//
// F1 is tracked as the raw metric distance (no squares, no final sqrt),
// exactly like the shipping implementations.
//
// The four samplers are written out longhand for the same reason as
// worley-fast.ts: many-argument plane helpers left earlier candidates at the
// mercy of a fragile JIT inlining decision.
//
// Measured with `bun run bench:impl` — see the inventory entries for the
// figures. Display norms are the shipping MANHATTAN/CHEBYSHEV ones: the point
// set distribution is unchanged, so the ranges match.

import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common.js'
import { CHEBYSHEV2_NORM, CHEBYSHEV3_NORM, MANHATTAN2_NORM, MANHATTAN3_NORM } from '../noises/normalization.js'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV10 = 1 / 1024

const mCell2 = (s: number, bx: number, by: number, f1: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const vx = bx + (h >>> 16) * INV16
  const vy = by + (h & 0xffff) * INV16
  const d = Math.abs(vx) + Math.abs(vy)
  return d < f1 ? d : f1
}

const cCell2 = (s: number, bx: number, by: number, f1: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const vx = bx + (h >>> 16) * INV16
  const vy = by + (h & 0xffff) * INV16
  const ax = Math.abs(vx)
  const ay = Math.abs(vy)
  const d = ax > ay ? ax : ay
  return d < f1 ? d : f1
}

export const manhattanFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const ym = (yc - LATTICE_HY) | 0
  const yp = (yc + LATTICE_HY) | 0
  const bxc = -fx
  const bym = -1 - fy
  const byc = -fy
  const byp = 1 - fy
  let f1 = mCell2((xc + yc) | 0, bxc, byc, 1e9)
  f1 = mCell2((xc + ym) | 0, bxc, bym, f1)
  f1 = mCell2((xc + yp) | 0, bxc, byp, f1)
  if (fx < f1) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    f1 = mCell2((xm + yc) | 0, bxm, byc, f1)
    f1 = mCell2((xm + ym) | 0, bxm, bym, f1)
    f1 = mCell2((xm + yp) | 0, bxm, byp, f1)
  }
  if (1 - fx < f1) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    f1 = mCell2((xp + yc) | 0, bxp, byc, f1)
    f1 = mCell2((xp + ym) | 0, bxp, bym, f1)
    f1 = mCell2((xp + yp) | 0, bxp, byp, f1)
  }
  return f1
}

export const chebyshevFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const ym = (yc - LATTICE_HY) | 0
  const yp = (yc + LATTICE_HY) | 0
  const bxc = -fx
  const bym = -1 - fy
  const byc = -fy
  const byp = 1 - fy
  let f1 = cCell2((xc + yc) | 0, bxc, byc, 1e9)
  f1 = cCell2((xc + ym) | 0, bxc, bym, f1)
  f1 = cCell2((xc + yp) | 0, bxc, byp, f1)
  if (fx < f1) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    f1 = cCell2((xm + yc) | 0, bxm, byc, f1)
    f1 = cCell2((xm + ym) | 0, bxm, bym, f1)
    f1 = cCell2((xm + yp) | 0, bxm, byp, f1)
  }
  if (1 - fx < f1) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    f1 = cCell2((xp + yc) | 0, bxp, byc, f1)
    f1 = cCell2((xp + ym) | 0, bxp, bym, f1)
    f1 = cCell2((xp + yp) | 0, bxp, byp, f1)
  }
  return f1
}

const mCell3 = (s: number, bx: number, by: number, bz: number, f1: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  const vx = bx + (h >>> 22) * INV10
  const vy = by + ((h >>> 12) & 1023) * INV10
  const vz = bz + ((h >>> 2) & 1023) * INV10
  const d = Math.abs(vx) + Math.abs(vy) + Math.abs(vz)
  return d < f1 ? d : f1
}

const cCell3 = (s: number, bx: number, by: number, bz: number, f1: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  const vx = bx + (h >>> 22) * INV10
  const vy = by + ((h >>> 12) & 1023) * INV10
  const vz = bz + ((h >>> 2) & 1023) * INV10
  const ax = Math.abs(vx)
  const ay = Math.abs(vy)
  const az = Math.abs(vz)
  const d = ax > ay ? (ax > az ? ax : az) : ay > az ? ay : az
  return d < f1 ? d : f1
}

export const manhattanFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const zc = Math.imul(iz, LATTICE_HZ)
  const xm = (xc - LATTICE_HX) | 0
  const xp = (xc + LATTICE_HX) | 0
  const ym = (yc - LATTICE_HY) | 0
  const yp = (yc + LATTICE_HY) | 0
  const bxm = -1 - fx
  const bxc = -fx
  const bxp = 1 - fx
  const bym = -1 - fy
  const byc = -fy
  const byp = 1 - fy
  const gx = 1 - fx
  let ymz = (ym + zc) | 0
  let ycz = (yc + zc) | 0
  let ypz = (yp + zc) | 0
  let bz = -fz
  let f1 = mCell3((xc + ycz) | 0, bxc, byc, bz, 1e9)
  f1 = mCell3((xc + ymz) | 0, bxc, bym, bz, f1)
  f1 = mCell3((xc + ypz) | 0, bxc, byp, bz, f1)
  if (fx < f1) {
    f1 = mCell3((xm + ycz) | 0, bxm, byc, bz, f1)
    f1 = mCell3((xm + ymz) | 0, bxm, bym, bz, f1)
    f1 = mCell3((xm + ypz) | 0, bxm, byp, bz, f1)
  }
  if (gx < f1) {
    f1 = mCell3((xp + ycz) | 0, bxp, byc, bz, f1)
    f1 = mCell3((xp + ymz) | 0, bxp, bym, bz, f1)
    f1 = mCell3((xp + ypz) | 0, bxp, byp, bz, f1)
  }
  // L1 bounds add across axes: a side plane's clearance is fz (or 1 - fz),
  // and a diagonal column inside it adds the x clearance on top.
  if (fz < f1) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    f1 = mCell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = mCell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = mCell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if (fx + fz < f1) {
      f1 = mCell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = mCell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = mCell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if (gx + fz < f1) {
      f1 = mCell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = mCell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = mCell3((xp + ypz) | 0, bxp, byp, bz, f1)
    }
  }
  const gz = 1 - fz
  if (gz < f1) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    f1 = mCell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = mCell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = mCell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if (fx + gz < f1) {
      f1 = mCell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = mCell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = mCell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if (gx + gz < f1) {
      f1 = mCell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = mCell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = mCell3((xp + ypz) | 0, bxp, byp, bz, f1)
    }
  }
  return f1
}

export const chebyshevFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const zc = Math.imul(iz, LATTICE_HZ)
  const xm = (xc - LATTICE_HX) | 0
  const xp = (xc + LATTICE_HX) | 0
  const ym = (yc - LATTICE_HY) | 0
  const yp = (yc + LATTICE_HY) | 0
  const bxm = -1 - fx
  const bxc = -fx
  const bxp = 1 - fx
  const bym = -1 - fy
  const byc = -fy
  const byp = 1 - fy
  const gx = 1 - fx
  let ymz = (ym + zc) | 0
  let ycz = (yc + zc) | 0
  let ypz = (yp + zc) | 0
  let bz = -fz
  let f1 = cCell3((xc + ycz) | 0, bxc, byc, bz, 1e9)
  f1 = cCell3((xc + ymz) | 0, bxc, bym, bz, f1)
  f1 = cCell3((xc + ypz) | 0, bxc, byp, bz, f1)
  if (fx < f1) {
    f1 = cCell3((xm + ycz) | 0, bxm, byc, bz, f1)
    f1 = cCell3((xm + ymz) | 0, bxm, bym, bz, f1)
    f1 = cCell3((xm + ypz) | 0, bxm, byp, bz, f1)
  }
  if (gx < f1) {
    f1 = cCell3((xp + ycz) | 0, bxp, byc, bz, f1)
    f1 = cCell3((xp + ymz) | 0, bxp, bym, bz, f1)
    f1 = cCell3((xp + ypz) | 0, bxp, byp, bz, f1)
  }
  // Linf bounds take the max across axes: a diagonal column in a side plane
  // is only as far as its NEAREST axis clearance allows.
  if (fz < f1) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    f1 = cCell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = cCell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = cCell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if ((fx > fz ? fx : fz) < f1) {
      f1 = cCell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = cCell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = cCell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if ((gx > fz ? gx : fz) < f1) {
      f1 = cCell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = cCell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = cCell3((xp + ypz) | 0, bxp, byp, bz, f1)
    }
  }
  const gz = 1 - fz
  if (gz < f1) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    f1 = cCell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = cCell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = cCell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if ((fx > gz ? fx : gz) < f1) {
      f1 = cCell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = cCell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = cCell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if ((gx > gz ? gx : gz) < f1) {
      f1 = cCell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = cCell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = cCell3((xp + ypz) | 0, bxp, byp, bz, f1)
    }
  }
  return f1
}

/** Worley (Manhattan) 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const worleyManhattan2dFast = (x: number, y: number): number => MANHATTAN2_NORM * manhattanFast2(x, y)

/** Worley (Manhattan) 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const worleyManhattan3dFast = (x: number, y: number, z: number): number =>
  MANHATTAN3_NORM * manhattanFast3(x, y, z)

/** Worley (Chebyshev) 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const worleyChebyshev2dFast = (x: number, y: number): number => CHEBYSHEV2_NORM * chebyshevFast2(x, y)

/** Worley (Chebyshev) 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const worleyChebyshev3dFast = (x: number, y: number, z: number): number =>
  CHEBYSHEV3_NORM * chebyshevFast3(x, y, z)
