// Cellular-family noises tuned for CPU throughput — candidates built on the
// worley-fast substrate (one hash per cell with split-bit offsets, centre-
// first pruned search). This file grows one noise at a time; see the
// inventory entries for each candidate's figures.
//
// MOSAIC. Tracks WHICH cell won the F1 search (its lattice fold `s`), prunes
// exactly like worley-fast, and derives the flat cell value from one
// lowbias32 avalanche of the winning fold — fully independent of the offset
// bits, so cell colours cannot correlate with feature-point positions. The
// shipping implementation spends 4-6 avalanches per cell; this spends one
// short mix per cell plus ONE avalanche for the winner.
//
// Longhand for the same fragile-JIT-inlining reason as worley-fast.ts.

import { FOAM_R, STARS_SHARP } from '../noises/cellular.js'
import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common.js'
import { CRACKLE_NORM, RIPPLE_NORM, STARS_NORM } from '../noises/normalization.js'
import { RIPPLE_FREQ, RIPPLE_RANGE } from '../noises/ripple.js'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV10 = 1 / 1024
const INV32 = 1 / 4294967296
const FOAM_R2 = FOAM_R * FOAM_R
const FOAM_INV_R = 1 / FOAM_R
/**
 * Splats fainter than ~1e-6 are dropped: exp(-18 * 0.77) < 1e-6, which is
 * far below one 8-bit display quantum. That cutoff is what lets columns and
 * planes prune a SUM, which is exact against no threshold only.
 */
const STARS_CUT = 0.77
const INV24 = 1 / 16777216
const TAU = 6.283185307179586
/** Window support: contributions vanish at d >= RIPPLE_RANGE. */
const RIPPLE_CUT2 = RIPPLE_RANGE * RIPPLE_RANGE
const INV_RANGE = 1 / RIPPLE_RANGE
const PHASE_SCALE = TAU / 256

const eCell2 = (s: number, bx: number, by: number, f1: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const vx = bx + (h >>> 16) * INV16
  const vy = by + (h & 0xffff) * INV16
  const d = vx * vx + vy * vy
  return d < f1 ? d : f1
}

const eCell3 = (s: number, bx: number, by: number, bz: number, f1: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  const vx = bx + (h >>> 22) * INV10
  const vy = by + ((h >>> 12) & 1023) * INV10
  const vz = bz + ((h >>> 2) & 1023) * INV10
  const d = vx * vx + vy * vy + vz * vz
  return d < f1 ? d : f1
}

/** One full avalanche of the winning cell's fold -> the flat cell value. */
const cellValue = (s: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return (h >>> 0) * INV32
}

export const mosaicFast2 = (x: number, y: number): number => {
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
  let f1 = 1e9
  let sb = 0
  {
    const s = (xc + yc) | 0
    const c = eCell2(s, bxc, byc, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  {
    const s = (xc + ym) | 0
    const c = eCell2(s, bxc, bym, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  {
    const s = (xc + yp) | 0
    const c = eCell2(s, bxc, byp, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  if (fx * fx < f1) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    {
      const s = (xm + yc) | 0
      const c = eCell2(s, bxm, byc, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xm + ym) | 0
      const c = eCell2(s, bxm, bym, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xm + yp) | 0
      const c = eCell2(s, bxm, byp, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
  }
  const gx = 1 - fx
  if (gx * gx < f1) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    {
      const s = (xp + yc) | 0
      const c = eCell2(s, bxp, byc, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xp + ym) | 0
      const c = eCell2(s, bxp, bym, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xp + yp) | 0
      const c = eCell2(s, bxp, byp, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
  }
  return cellValue(sb)
}

export const mosaicFast3 = (x: number, y: number, z: number): number => {
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
  const fx2 = fx * fx
  const gx = 1 - fx
  const gx2 = gx * gx
  let ymz = 0
  let ycz = 0
  let ypz = 0
  let bz = 0
  let f1 = 1e9
  let sb = 0
  ymz = (ym + zc) | 0
  ycz = (yc + zc) | 0
  ypz = (yp + zc) | 0
  bz = -fz
  {
    const s = (xc + ycz) | 0
    const c = eCell3(s, bxc, byc, bz, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  {
    const s = (xc + ymz) | 0
    const c = eCell3(s, bxc, bym, bz, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  {
    const s = (xc + ypz) | 0
    const c = eCell3(s, bxc, byp, bz, f1)
    if (c !== f1) {
      f1 = c
      sb = s
    }
  }
  if (fx2 < f1) {
    {
      const s = (xm + ycz) | 0
      const c = eCell3(s, bxm, byc, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xm + ymz) | 0
      const c = eCell3(s, bxm, bym, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xm + ypz) | 0
      const c = eCell3(s, bxm, byp, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
  }
  if (gx2 < f1) {
    {
      const s = (xp + ycz) | 0
      const c = eCell3(s, bxp, byc, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xp + ymz) | 0
      const c = eCell3(s, bxp, bym, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xp + ypz) | 0
      const c = eCell3(s, bxp, byp, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
  }
  const zzm = fz * fz
  if (zzm < f1) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    {
      const s = (xc + ycz) | 0
      const c = eCell3(s, bxc, byc, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xc + ymz) | 0
      const c = eCell3(s, bxc, bym, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xc + ypz) | 0
      const c = eCell3(s, bxc, byp, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    if (fx2 + zzm < f1) {
      {
        const s = (xm + ycz) | 0
        const c = eCell3(s, bxm, byc, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xm + ymz) | 0
        const c = eCell3(s, bxm, bym, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xm + ypz) | 0
        const c = eCell3(s, bxm, byp, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
    }
    if (gx2 + zzm < f1) {
      {
        const s = (xp + ycz) | 0
        const c = eCell3(s, bxp, byc, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xp + ymz) | 0
        const c = eCell3(s, bxp, bym, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xp + ypz) | 0
        const c = eCell3(s, bxp, byp, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
    }
  }
  const gz = 1 - fz
  const zzp = gz * gz
  if (zzp < f1) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    {
      const s = (xc + ycz) | 0
      const c = eCell3(s, bxc, byc, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xc + ymz) | 0
      const c = eCell3(s, bxc, bym, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    {
      const s = (xc + ypz) | 0
      const c = eCell3(s, bxc, byp, bz, f1)
      if (c !== f1) {
        f1 = c
        sb = s
      }
    }
    if (fx2 + zzp < f1) {
      {
        const s = (xm + ycz) | 0
        const c = eCell3(s, bxm, byc, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xm + ymz) | 0
        const c = eCell3(s, bxm, bym, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xm + ypz) | 0
        const c = eCell3(s, bxm, byp, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
    }
    if (gx2 + zzp < f1) {
      {
        const s = (xp + ycz) | 0
        const c = eCell3(s, bxp, byc, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xp + ymz) | 0
        const c = eCell3(s, bxp, bym, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
      {
        const s = (xp + ypz) | 0
        const c = eCell3(s, bxp, byp, bz, f1)
        if (c !== f1) {
          f1 = c
          sb = s
        }
      }
    }
  }
  return cellValue(sb)
}

// CRACKLE. F2 - F1 over the same substrate. Pruning tests against F2: a
// skipped column can contain neither the nearest nor the second-nearest
// point, so the pair — and the difference — is exactly the unpruned one.

export const crackleFast2 = (x: number, y: number): number => {
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
  let f1 = 1e9
  let f2 = 1e9
  {
    const s = (xc + yc) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byc + (h & 0xffff) * INV16
    const d = vx * vx + vy * vy
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  {
    const s = (xc + ym) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = bym + (h & 0xffff) * INV16
    const d = vx * vx + vy * vy
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  {
    const s = (xc + yp) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byp + (h & 0xffff) * INV16
    const d = vx * vx + vy * vy
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  if (fx * fx < f2) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    {
      const s = (xm + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xm + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xm + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  const gx = 1 - fx
  if (gx * gx < f2) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    {
      const s = (xp + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xp + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xp + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const d = vx * vx + vy * vy
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  return Math.sqrt(f2) - Math.sqrt(f1)
}

export const crackleFast3 = (x: number, y: number, z: number): number => {
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
  const fx2 = fx * fx
  const gx = 1 - fx
  const gx2 = gx * gx
  let ymz = 0
  let ycz = 0
  let ypz = 0
  let bz = 0
  let f1 = 1e9
  let f2 = 1e9
  ymz = (ym + zc) | 0
  ycz = (yc + zc) | 0
  ypz = (yp + zc) | 0
  bz = -fz
  {
    const s = (xc + ycz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byc + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d = vx * vx + vy * vy + vz * vz
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  {
    const s = (xc + ymz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = bym + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d = vx * vx + vy * vy + vz * vz
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  {
    const s = (xc + ypz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byp + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d = vx * vx + vy * vy + vz * vz
    if (d < f1) {
      f2 = f1
      f1 = d
    } else if (d < f2) {
      f2 = d
    }
  }
  if (fx2 < f2) {
    {
      const s = (xm + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xm + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xm + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  if (gx2 < f2) {
    {
      const s = (xp + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xp + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xp + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  const zzm = fz * fz
  if (zzm < f2) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    if (fx2 + zzm < f2) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
    }
    if (gx2 + zzm < f2) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
    }
  }
  const gz = 1 - fz
  const zzp = gz * gz
  if (zzp < f2) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d = vx * vx + vy * vy + vz * vz
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
    if (fx2 + zzp < f2) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
    }
    if (gx2 + zzp < f2) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d = vx * vx + vy * vy + vz * vz
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) {
          f2 = d
        }
      }
    }
  }
  return Math.sqrt(f2) - Math.sqrt(f1)
}

// FOAM. Max of sqrt(R^2 - d^2) / R domes. Tracks q = max(R^2 - d^2), which
// is monotone with the dome height, so the whole search costs ONE sqrt at
// the end where the shipping loop pays one per contributing cell. A cell can
// only raise the max if its d^2 beats R^2 - q, which is also the prune
// threshold — it tightens as q grows.

export const foamFast2 = (x: number, y: number): number => {
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
  let q = 0
  {
    const s = (xc + yc) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byc + (h & 0xffff) * INV16
    const t = FOAM_R2 - (vx * vx + vy * vy)
    if (t > q) q = t
  }
  {
    const s = (xc + ym) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = bym + (h & 0xffff) * INV16
    const t = FOAM_R2 - (vx * vx + vy * vy)
    if (t > q) q = t
  }
  {
    const s = (xc + yp) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byp + (h & 0xffff) * INV16
    const t = FOAM_R2 - (vx * vx + vy * vy)
    if (t > q) q = t
  }
  if (fx * fx < FOAM_R2 - q) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    {
      const s = (xm + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
    {
      const s = (xm + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
    {
      const s = (xm + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
  }
  const gx = 1 - fx
  if (gx * gx < FOAM_R2 - q) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    {
      const s = (xp + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
    {
      const s = (xp + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
    {
      const s = (xp + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const t = FOAM_R2 - (vx * vx + vy * vy)
      if (t > q) q = t
    }
  }
  return q > 0 ? Math.sqrt(q) * FOAM_INV_R : 0
}

export const foamFast3 = (x: number, y: number, z: number): number => {
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
  const fx2 = fx * fx
  const gx = 1 - fx
  const gx2 = gx * gx
  let ymz = 0
  let ycz = 0
  let ypz = 0
  let bz = 0
  let q = 0
  ymz = (ym + zc) | 0
  ycz = (yc + zc) | 0
  ypz = (yp + zc) | 0
  bz = -fz
  {
    const s = (xc + ycz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byc + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
    if (t > q) q = t
  }
  {
    const s = (xc + ymz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = bym + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
    if (t > q) q = t
  }
  {
    const s = (xc + ypz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byp + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
    if (t > q) q = t
  }
  if (fx2 < FOAM_R2 - q) {
    {
      const s = (xm + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xm + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xm + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
  }
  if (gx2 < FOAM_R2 - q) {
    {
      const s = (xp + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xp + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xp + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
  }
  const zzm = fz * fz
  if (zzm < FOAM_R2 - q) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    if (fx2 + zzm < FOAM_R2 - q) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
    }
    if (gx2 + zzm < FOAM_R2 - q) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
    }
  }
  const gz = 1 - fz
  const zzp = gz * gz
  if (zzp < FOAM_R2 - q) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
      if (t > q) q = t
    }
    if (fx2 + zzp < FOAM_R2 - q) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
    }
    if (gx2 + zzp < FOAM_R2 - q) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const t = FOAM_R2 - (vx * vx + vy * vy + vz * vz)
        if (t > q) q = t
      }
    }
  }
  return q > 0 ? Math.sqrt(q) * FOAM_INV_R : 0
}

// STARS. Sum of brightness * exp(-d^2 * sharp) splats. A sum admits no exact
// pruning, so the candidate defines a cutoff: contributions with
// d^2 >= STARS_CUT (under 1e-6, below display precision) are dropped, and a
// column or plane whose boundary clears the cutoff is never hashed at all.
// Brightness comes from one cheap remix of the cell hash.

export const starsFast2 = (x: number, y: number): number => {
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
  let sum = 0
  {
    const s = (xc + yc) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byc + (h & 0xffff) * INV16
    const d2 = vx * vx + vy * vy
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  {
    const s = (xc + ym) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = bym + (h & 0xffff) * INV16
    const d2 = vx * vx + vy * vy
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  {
    const s = (xc + yp) | 0
    let h = Math.imul(s ^ (s >>> 16), FIB)
    h ^= h >>> 16
    const vx = bxc + (h >>> 16) * INV16
    const vy = byp + (h & 0xffff) * INV16
    const d2 = vx * vx + vy * vy
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  if (fx * fx < STARS_CUT) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    {
      const s = (xm + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xm + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xm + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxm + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
  }
  const gx = 1 - fx
  if (gx * gx < STARS_CUT) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    {
      const s = (xp + yc) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byc + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xp + ym) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = bym + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xp + yp) | 0
      let h = Math.imul(s ^ (s >>> 16), FIB)
      h ^= h >>> 16
      const vx = bxp + (h >>> 16) * INV16
      const vy = byp + (h & 0xffff) * INV16
      const d2 = vx * vx + vy * vy
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
  }
  return sum
}

export const starsFast3 = (x: number, y: number, z: number): number => {
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
  const fx2 = fx * fx
  const gx = 1 - fx
  const gx2 = gx * gx
  let ymz = 0
  let ycz = 0
  let ypz = 0
  let bz = 0
  let sum = 0
  ymz = (ym + zc) | 0
  ycz = (yc + zc) | 0
  ypz = (yp + zc) | 0
  bz = -fz
  {
    const s = (xc + ycz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byc + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d2 = vx * vx + vy * vy + vz * vz
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  {
    const s = (xc + ymz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = bym + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d2 = vx * vx + vy * vy + vz * vz
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  {
    const s = (xc + ypz) | 0
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const vx = bxc + (h >>> 22) * INV10
    const vy = byp + ((h >>> 12) & 1023) * INV10
    const vz = bz + ((h >>> 2) & 1023) * INV10
    const d2 = vx * vx + vy * vy + vz * vz
    if (d2 < STARS_CUT) {
      const bh = Math.imul(h ^ (h >>> 15), FIB)
      sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
    }
  }
  if (fx2 < STARS_CUT) {
    {
      const s = (xm + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xm + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xm + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxm + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
  }
  if (gx2 < STARS_CUT) {
    {
      const s = (xp + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xp + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xp + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxp + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
  }
  const zzm = fz * fz
  if (zzm < STARS_CUT) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    if (fx2 + zzm < STARS_CUT) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
    }
    if (gx2 + zzm < STARS_CUT) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
    }
  }
  const gz = 1 - fz
  const zzp = gz * gz
  if (zzp < STARS_CUT) {
    const zp = (zc + LATTICE_HZ) | 0
    ymz = (ym + zp) | 0
    ycz = (yc + zp) | 0
    ypz = (yp + zp) | 0
    bz = 1 - fz
    {
      const s = (xc + ycz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byc + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xc + ymz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = bym + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    {
      const s = (xc + ypz) | 0
      let h = s ^ (s >>> 16)
      h = Math.imul(h, 0x7feb352d)
      h ^= h >>> 15
      h = Math.imul(h, 0x846ca68b)
      h ^= h >>> 16
      const vx = bxc + (h >>> 22) * INV10
      const vy = byp + ((h >>> 12) & 1023) * INV10
      const vz = bz + ((h >>> 2) & 1023) * INV10
      const d2 = vx * vx + vy * vy + vz * vz
      if (d2 < STARS_CUT) {
        const bh = Math.imul(h ^ (h >>> 15), FIB)
        sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
      }
    }
    if (fx2 + zzp < STARS_CUT) {
      {
        const s = (xm + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xm + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xm + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxm + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
    }
    if (gx2 + zzp < STARS_CUT) {
      {
        const s = (xp + ycz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byc + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xp + ymz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = bym + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
      {
        const s = (xp + ypz) | 0
        let h = s ^ (s >>> 16)
        h = Math.imul(h, 0x7feb352d)
        h ^= h >>> 15
        h = Math.imul(h, 0x846ca68b)
        h ^= h >>> 16
        const vx = bxp + (h >>> 22) * INV10
        const vy = byp + ((h >>> 12) & 1023) * INV10
        const vz = bz + ((h >>> 2) & 1023) * INV10
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < STARS_CUT) {
          const bh = Math.imul(h ^ (h >>> 15), FIB)
          sum += (bh >>> 8) * INV24 * Math.exp(-d2 * STARS_SHARP)
        }
      }
    }
  }
  return sum
}

// RIPPLE. Windowed radial waves. The window radius (1.5 cells) exceeds every
// column bound, so no cell can be pruned away — but a cell whose d^2 clears
// the window support contributes exactly zero, and the shipping loop still
// pays its sqrt and cos before multiplying by that zero. Here the window
// test comes first, so far cells cost one mix and one compare. Offsets come
// from the usual split bits; the wave phase from one cheap remix.

const rippleFastCell2 = (s: number, bx: number, by: number, sum: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const vx = bx + (h >>> 16) * INV16
  const vy = by + (h & 0xffff) * INV16
  const d2 = vx * vx + vy * vy
  if (d2 >= RIPPLE_CUT2) return sum
  const d = Math.sqrt(d2)
  const w = 1 - d * INV_RANGE
  const bh = Math.imul(h ^ (h >>> 15), FIB)
  return sum + w * w * Math.cos(d * RIPPLE_FREQ - (bh >>> 24) * PHASE_SCALE)
}

const rippleFastCell3 = (s: number, bx: number, by: number, bz: number, sum: number): number => {
  let h = s ^ (s >>> 16)
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  const vx = bx + (h >>> 22) * INV10
  const vy = by + ((h >>> 12) & 1023) * INV10
  const vz = bz + ((h >>> 2) & 1023) * INV10
  const d2 = vx * vx + vy * vy + vz * vz
  if (d2 >= RIPPLE_CUT2) return sum
  const d = Math.sqrt(d2)
  const w = 1 - d * INV_RANGE
  const bh = Math.imul(h ^ (h >>> 15), FIB)
  return sum + w * w * Math.cos(d * RIPPLE_FREQ - (bh >>> 24) * PHASE_SCALE)
}

export const rippleFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const xc = Math.imul(ix, LATTICE_HX)
  const yc = Math.imul(iy, LATTICE_HY)
  const xm = (xc - LATTICE_HX) | 0
  const xp = (xc + LATTICE_HX) | 0
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    const yv = (yc + Math.imul(dy, LATTICE_HY)) | 0
    const by = dy - fy
    sum = rippleFastCell2((xm + yv) | 0, -1 - fx, by, sum)
    sum = rippleFastCell2((xc + yv) | 0, -fx, by, sum)
    sum = rippleFastCell2((xp + yv) | 0, 1 - fx, by, sum)
  }
  return sum
}

export const rippleFast3 = (x: number, y: number, z: number): number => {
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
  let sum = 0
  for (let dz = -1; dz <= 1; dz++) {
    const zv = (zc + Math.imul(dz, LATTICE_HZ)) | 0
    const bz = dz - fz
    for (let dy = -1; dy <= 1; dy++) {
      const yzv = (zv + yc + Math.imul(dy, LATTICE_HY)) | 0
      const by = dy - fy
      sum = rippleFastCell3((xm + yzv) | 0, -1 - fx, by, bz, sum)
      sum = rippleFastCell3((xc + yzv) | 0, -fx, by, bz, sum)
      sum = rippleFastCell3((xp + yzv) | 0, 1 - fx, by, bz, sum)
    }
  }
  return sum
}

/** Ripple 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const ripple2dFast = (x: number, y: number): number => 0.5 + 0.5 * RIPPLE_NORM * rippleFast2(x, y)

/** Ripple 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const ripple3dFast = (x: number, y: number, z: number): number => 0.5 + 0.5 * RIPPLE_NORM * rippleFast3(x, y, z)

/** Stars 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const stars2dFast = (x: number, y: number): number => STARS_NORM * starsFast2(x, y)

/** Stars 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const stars3dFast = (x: number, y: number, z: number): number => STARS_NORM * starsFast3(x, y, z)

/** Foam 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const foam2dFast = foamFast2

/** Foam 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const foam3dFast = foamFast3

/** Crackle 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const crackle2dFast = (x: number, y: number): number => CRACKLE_NORM * crackleFast2(x, y)

/** Crackle 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const crackle3dFast = (x: number, y: number, z: number): number => CRACKLE_NORM * crackleFast3(x, y, z)

/** Mosaic 2D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const mosaic2dFast = mosaicFast2

/** Mosaic 3D, 'split-bits-pruned' fast implementation — display value, unclamped. */
export const mosaic3dFast = mosaicFast3
