// Worley (cellular) noise tuned for CPU throughput — a candidate faster
// implementation of the same algorithm as noises/worley.ts. Same one point
// per cell, same F1 Euclidean metric, same 3x3 / 3x3x3 neighbourhood
// contract; what changes is what a cell costs and whether it is visited at
// all.
//
// Two things make this faster on a CPU:
//
// 1. ONE HASH PER CELL INSTEAD OF CHAINED AVALANCHES. The shipping code
//    hashes a cell with hash2/hash3 and then re-hashes for each extra offset
//    axis: three full lowbias32 avalanches per 2D cell, five per 3D cell.
//    Here the lattice products are folded exactly as in alt/perlin-fast.ts —
//    per-axis odd-constant multiplies hoisted out of the loop, neighbours one
//    add away — and ALL of a cell's offsets come out of ONE 32-bit hash:
//    16+16 bits in 2D, 10+10+10 bits in 3D. The feature-point positions are
//    therefore quantized to 2^-16 (2D) / 2^-10 (3D) of a cell, against the
//    shipping 2^-32; at display scale a thousandth of a cell is far below a
//    pixel.
//
//    The mix differs by dimension, and the difference is a measured fact,
//    not taste. 2D: one xor-shift, one multiply by 2^32/phi, one closing
//    xor-shift — on the two-axis fold its position bins pass marginals and
//    joints at +x/+y/+xy (worst 279 against a 255-df critical of 293). 3D:
//    the SAME mix fails the diagonal joints on the three-axis fold — +yz
//    measured at chi-square 531-682 against 293, a defect this file's first
//    version SHIPPED and the simplex pass caught — so 3D cells use the full
//    lowbias32 shape (minus the u32 coercions), which passes everywhere the
//    battery looks. The upgrade costs ~13% of the 3D win and the single
//    hash-per-cell structure keeps the rest.
//
// 2. THE SEARCH PRUNES WHOLE COLUMNS AND PLANES. The shipping loop hashes all
//    9 / 27 cells unconditionally. Here the centre column (2D) or centre
//    plane (3D) is evaluated first to establish a tight F1, and a
//    neighbouring column or plane is entered only if the squared distance to
//    its near boundary still beats the current F1 — a conservative test, so
//    the result is EXACTLY the unpruned one (verified over 600k probes:
//    zero mismatches, it is the same min taken in a different order). Worley's
//    own algorithm skips neighbouring cubes that cannot contain a closer
//    point, so pruning restores a reference behaviour the shipping exhaustive
//    loop dropped. The win scales with dimension because a skipped 3D plane
//    is nine cells: ~2.0x the shipping worley2 and ~3.4x worley3 on the CPU,
//    best and median agreeing (`bun run bench:impl`; the 3D figure includes
//    the ~13% cost of the hash fix, and the 2D figure is from an isolated
//    run — see the harness caveat in bench.ts).
//
// The FIELD is a different draw from the shipping one — different hash,
// different point positions, same distribution: field mean/rms/extrema match
// the shipping worley to three decimals over 1M samples.
//
// CPU ONLY, like the Perlin candidate, and doubly so: the pruning branches
// are exactly what a GPU pays divergence for, so the GPU trade needs its own
// measurement before any of this is believed there. No GLSL/WGSL/TSL
// backends exist yet, so this cannot ship — registry variants need all four
// languages.
//
// Output matches noises/worley.ts: Euclidean F1, roughly [0, 1.3].

import { LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV16 = 1 / 65536
const INV10 = 1 / 1024

/**
 * Fold one cell's F1 candidate into the running minimum. `bx`/`by` are the
 * cell's base offsets (cell index minus the query fraction), so the feature
 * point lands at base + hashed offset.
 */
const cell2 = (s: number, bx: number, by: number, f1: number): number => {
  let h = Math.imul(s ^ (s >>> 16), FIB)
  h ^= h >>> 16
  const vx = bx + (h >>> 16) * INV16
  const vy = by + (h & 0xffff) * INV16
  const d = vx * vx + vy * vy
  return d < f1 ? d : f1
}

export const worleyFast2 = (x: number, y: number): number => {
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
  // Centre column first: the cheapest way to make F1 tight before the
  // neighbouring columns are tested against it.
  let f1 = cell2((xc + yc) | 0, bxc, byc, 1e9)
  f1 = cell2((xc + ym) | 0, bxc, bym, f1)
  f1 = cell2((xc + yp) | 0, bxc, byp, f1)
  // A point in the left column has vx <= -fx, so it can only win if
  // fx^2 < f1. Conservative, so pruning never changes the result.
  if (fx * fx < f1) {
    const xm = (xc - LATTICE_HX) | 0
    const bxm = -1 - fx
    f1 = cell2((xm + yc) | 0, bxm, byc, f1)
    f1 = cell2((xm + ym) | 0, bxm, bym, f1)
    f1 = cell2((xm + yp) | 0, bxm, byp, f1)
  }
  const gx = 1 - fx
  if (gx * gx < f1) {
    const xp = (xc + LATTICE_HX) | 0
    const bxp = 1 - fx
    f1 = cell2((xp + yc) | 0, bxp, byc, f1)
    f1 = cell2((xp + ym) | 0, bxp, bym, f1)
    f1 = cell2((xp + yp) | 0, bxp, byp, f1)
  }
  return Math.sqrt(f1)
}

// Full lowbias32 shape: the 10-bit fields reach into low bits, and the
// cheaper single-multiply mix fails +yz adjacency on the three-axis fold
// (see header).
const cell3 = (s: number, bx: number, by: number, bz: number, f1: number): number => {
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

// The three z-planes are written out longhand rather than through a plane
// helper, and that is load-bearing: a 14-argument helper carrying the plane
// state measured anywhere from 430 to 550 ms in the bench harness depending
// on which script surrounded it — the JIT's inlining decision for it is
// fragile — while this inlined form sits at ~250 ms and stays there. Only
// cell3 stays a function; it is small enough to inline reliably. Each plane
// is centre column first, then the side columns behind boundary tests that
// fold in the plane's own minimal squared z distance, so a diagonal column
// is pruned by both axes at once.
export const worleyFast3 = (x: number, y: number, z: number): number => {
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
  // Centre plane first, then each side plane behind its boundary test. A
  // skipped plane is nine cells never hashed, which is where the 3D win
  // comes from.
  let ymz = (ym + zc) | 0
  let ycz = (yc + zc) | 0
  let ypz = (yp + zc) | 0
  let bz = -fz
  let f1 = cell3((xc + ycz) | 0, bxc, byc, bz, 1e9)
  f1 = cell3((xc + ymz) | 0, bxc, bym, bz, f1)
  f1 = cell3((xc + ypz) | 0, bxc, byp, bz, f1)
  if (fx2 < f1) {
    f1 = cell3((xm + ycz) | 0, bxm, byc, bz, f1)
    f1 = cell3((xm + ymz) | 0, bxm, bym, bz, f1)
    f1 = cell3((xm + ypz) | 0, bxm, byp, bz, f1)
  }
  if (gx2 < f1) {
    f1 = cell3((xp + ycz) | 0, bxp, byc, bz, f1)
    f1 = cell3((xp + ymz) | 0, bxp, bym, bz, f1)
    f1 = cell3((xp + ypz) | 0, bxp, byp, bz, f1)
  }
  const zzm = fz * fz
  if (zzm < f1) {
    const zm = (zc - LATTICE_HZ) | 0
    ymz = (ym + zm) | 0
    ycz = (yc + zm) | 0
    ypz = (yp + zm) | 0
    bz = -1 - fz
    f1 = cell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = cell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = cell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if (fx2 + zzm < f1) {
      f1 = cell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = cell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = cell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if (gx2 + zzm < f1) {
      f1 = cell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = cell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = cell3((xp + ypz) | 0, bxp, byp, bz, f1)
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
    f1 = cell3((xc + ycz) | 0, bxc, byc, bz, f1)
    f1 = cell3((xc + ymz) | 0, bxc, bym, bz, f1)
    f1 = cell3((xc + ypz) | 0, bxc, byp, bz, f1)
    if (fx2 + zzp < f1) {
      f1 = cell3((xm + ycz) | 0, bxm, byc, bz, f1)
      f1 = cell3((xm + ymz) | 0, bxm, bym, bz, f1)
      f1 = cell3((xm + ypz) | 0, bxm, byp, bz, f1)
    }
    if (gx2 + zzp < f1) {
      f1 = cell3((xp + ycz) | 0, bxp, byc, bz, f1)
      f1 = cell3((xp + ymz) | 0, bxp, bym, bz, f1)
      f1 = cell3((xp + ypz) | 0, bxp, byp, bz, f1)
    }
  }
  return Math.sqrt(f1)
}
