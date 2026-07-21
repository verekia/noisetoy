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

import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV10 = 1 / 1024
const INV32 = 1 / 4294967296

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
