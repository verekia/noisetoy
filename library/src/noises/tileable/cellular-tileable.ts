// Tileable cellular family (Mosaic, Crackle, Foam, Stars): identical
// loops to cellular.ts with cell hash coordinates wrapped modulo the period in
// x/y (Worley-style). Distances and offsets stay geometric.
// Kept out of the core implementation.

import { FOAM_R, STARS_SHARP } from '../cellular.js'
import { hash2, hash3, hashU32, imod, to01 } from '../common.js'
import { CRACKLE_NORM, STARS_NORM } from '../normalization.js'

type Best2 = { d2: number; vx: number; vy: number; h: number }

const nearest2T = (x: number, y: number, px: number, py: number): Best2 => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const best: Best2 = { d2: 1e9, vx: 0, vy: 0, h: 0 }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d2 = vx * vx + vy * vy
      if (d2 < best.d2) {
        best.d2 = d2
        best.vx = vx
        best.vy = vy
        best.h = h
      }
    }
  }
  return best
}

type Best3 = { d2: number; vx: number; vy: number; vz: number; h: number }

const nearest3T = (x: number, y: number, z: number, px: number, py: number): Best3 => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const best: Best3 = { d2: 1e9, vx: 0, vy: 0, vz: 0, h: 0 }
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < best.d2) {
          best.d2 = d2
          best.vx = vx
          best.vy = vy
          best.vz = vz
          best.h = h
        }
      }
    }
  }
  return best
}

export const mosaic2Tileable = (x: number, y: number, px: number, py: number): number =>
  to01(hashU32(hashU32(nearest2T(x, y, px, py).h)))

export const mosaic3Tileable = (x: number, y: number, z: number, px: number, py: number): number =>
  to01(hashU32(hashU32(hashU32(nearest3T(x, y, z, px, py).h))))

export const crackle2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  let f2 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d2 = vx * vx + vy * vy
      if (d2 < f1) {
        f2 = f1
        f1 = d2
      } else if (d2 < f2) {
        f2 = d2
      }
    }
  }
  return Math.sqrt(f2) - Math.sqrt(f1)
}

export const crackle3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let f1 = 1e9
  let f2 = 1e9
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d2 = vx * vx + vy * vy + vz * vz
        if (d2 < f1) {
          f2 = f1
          f1 = d2
        } else if (d2 < f2) {
          f2 = d2
        }
      }
    }
  }
  return Math.sqrt(f2) - Math.sqrt(f1)
}

export const foam2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let m = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const t = FOAM_R * FOAM_R - (vx * vx + vy * vy)
      if (t > 0) {
        const dome = Math.sqrt(t) / FOAM_R
        if (dome > m) m = dome
      }
    }
  }
  return m
}

export const foam3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let m = 0
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const t = FOAM_R * FOAM_R - (vx * vx + vy * vy + vz * vz)
        if (t > 0) {
          const dome = Math.sqrt(t) / FOAM_R
          if (dome > m) m = dome
        }
      }
    }
  }
  return m
}

export const stars2Tileable = (x: number, y: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(imod(ix + dx, px), imod(iy + dy, py))
      const h2 = hashU32(h)
      const vx = dx + to01(h) - fx
      const vy = dy + to01(h2) - fy
      sum += to01(hashU32(h2)) * Math.exp(-(vx * vx + vy * vy) * STARS_SHARP)
    }
  }
  return sum
}

export const stars3Tileable = (x: number, y: number, z: number, px: number, py: number): number => {
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
        const h = hash3(imod(ix + dx, px), imod(iy + dy, py), iz + dz)
        const h2 = hashU32(h)
        const h3 = hashU32(h2)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(h3) - fz
        sum += to01(hashU32(h3)) * Math.exp(-(vx * vx + vy * vy + vz * vz) * STARS_SHARP)
      }
    }
  }
  return sum
}

/** Mosaic 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const mosaic2dCanonicalTileable = mosaic2Tileable

/** Mosaic 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const mosaic3dCanonicalTileable = mosaic3Tileable

/** Crackle 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const crackle2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  CRACKLE_NORM * crackle2Tileable(x, y, periodX, periodY)

/** Crackle 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const crackle3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  CRACKLE_NORM * crackle3Tileable(x, y, z, periodX, periodY)

/** Foam 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const foam2dCanonicalTileable = foam2Tileable

/** Foam 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const foam3dCanonicalTileable = foam3Tileable

/** Stars 2D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const stars2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  STARS_NORM * stars2Tileable(x, y, periodX, periodY)

/** Stars 3D tileable, shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const stars3dCanonicalTileable = (x: number, y: number, z: number, periodX: number, periodY: number): number =>
  STARS_NORM * stars3Tileable(x, y, z, periodX, periodY)
