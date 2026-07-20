// Cellular family: five point-set noises sharing the Worley neighbor loop
// (one hashed feature point per lattice cell, 3x3 / 3x3x3 search).
//
// Provenance / disclosure — all are original formulations for this repo built
// on Steven Worley's cellular basis ("A Cellular Texture Basis Function",
// SIGGRAPH 1996; no known patent):
// - Mosaic: flat shading by the nearest feature point's hash ("Voronoi id"),
//   a widespread shader-folklore variant of Worley noise.
// - Crackle: F2 - F1 (distance to second-nearest minus nearest), a variant
//   suggested in Worley's own paper.
// - Foam: original — max of spherical domes sqrt(R^2 - d^2) over feature
//   points; related to folklore "bubble"/metaball fields (sparse convolution
//   after J.P. Lewis, 1989; no known patent).
// - Stars: original — sum of Gaussian splats exp(-d^2 * sharp) with hashed
//   brightness; related to point-splatting folklore.
//
// MIT. No trigonometric identity or code is taken from any implementation.

import { hash2, hash3, hashU32, to01 } from './common'

export const FOAM_R = 1.1
export const STARS_SHARP = 18

type Cell2 = { d2: number; vx: number; vy: number; h: number }

const nearest2 = (x: number, y: number): Cell2 => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const best: Cell2 = { d2: 1e9, vx: 0, vy: 0, h: 0 }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
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

type Cell3 = { d2: number; vx: number; vy: number; vz: number; h: number }

const nearest3 = (x: number, y: number, z: number): Cell3 => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const best: Cell3 = { d2: 1e9, vx: 0, vy: 0, vz: 0, h: 0 }
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(ix + dx, iy + dy, iz + dz)
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

export const mosaic2 = (x: number, y: number): number => to01(hashU32(hashU32(nearest2(x, y).h)))

export const mosaic3 = (x: number, y: number, z: number): number => to01(hashU32(hashU32(hashU32(nearest3(x, y, z).h))))

export const crackle2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  let f2 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
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

export const crackle3 = (x: number, y: number, z: number): number => {
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
        const h = hash3(ix + dx, iy + dy, iz + dz)
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

export const foam2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let m = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
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

export const foam3 = (x: number, y: number, z: number): number => {
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
        const h = hash3(ix + dx, iy + dy, iz + dz)
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

export const stars2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
      const h2 = hashU32(h)
      const vx = dx + to01(h) - fx
      const vy = dy + to01(h2) - fy
      sum += to01(hashU32(h2)) * Math.exp(-(vx * vx + vy * vy) * STARS_SHARP)
    }
  }
  return sum
}

export const stars3 = (x: number, y: number, z: number): number => {
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
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(h3) - fz
        sum += to01(hashU32(h3)) * Math.exp(-(vx * vx + vy * vy + vz * vz) * STARS_SHARP)
      }
    }
  }
  return sum
}
