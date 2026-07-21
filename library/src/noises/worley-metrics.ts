// Worley (cellular) noise under non-Euclidean distance metrics, on Steven
// Worley's cellular basis ("A Cellular Texture Basis Function", 1996).
//
// Attribution, precisely: the paper DOES discuss the Manhattan metric — it
// "forms regions that are rigidly rectangular", which Worley suggests for
// spaceship hulls — along with a radial variant. It does NOT mention Chebyshev
// or Minkowski anywhere. Substituting Linf is standard practice but it is
// later folklore, not something to credit to the paper.
//
// Same feature-point set and same 3x3 /
// 3x3x3 search as worley.ts — only the distance changes, and with it the shape
// of the iso-distance contours around each feature point:
//
//   Manhattan (L1)   |dx| + |dy|      diamonds (squares turned 45 degrees)
//   Chebyshev (Linf) max(|dx|, |dy|)  axis-aligned squares
//
// Both are rectilinear where Euclidean is round, which is what makes them
// useful for crystalline, circuit-board and tiled-floor looks. Note that the
// two are not independent looks: the Linf unit ball is the L1 ball rotated 45
// degrees and scaled, so their Voronoi diagrams are rotations of one another.
// What differs on screen is the orientation of the contours, not the topology
// of the cells. Original implementation (MIT).
//
// Ranges are wider (L1) and narrower (Linf) than Euclidean, so each gets its
// own display normalization; see normalization.ts.

import { hash2, hash3, hashU32, to01 } from './common.js'
import { CHEBYSHEV2_NORM, CHEBYSHEV3_NORM, MANHATTAN2_NORM, MANHATTAN3_NORM } from './normalization.js'

export const manhattan2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d = Math.abs(vx) + Math.abs(vy)
      if (d < f1) f1 = d
    }
  }
  return f1
}

export const manhattan3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let f1 = 1e9
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(ix + dx, iy + dy, iz + dz)
        const h2 = hashU32(h)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d = Math.abs(vx) + Math.abs(vy) + Math.abs(vz)
        if (d < f1) f1 = d
      }
    }
  }
  return f1
}

export const chebyshev2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  let f1 = 1e9
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const h = hash2(ix + dx, iy + dy)
      const vx = dx + to01(h) - fx
      const vy = dy + to01(hashU32(h)) - fy
      const d = Math.max(Math.abs(vx), Math.abs(vy))
      if (d < f1) f1 = d
    }
  }
  return f1
}

export const chebyshev3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  let f1 = 1e9
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash3(ix + dx, iy + dy, iz + dz)
        const h2 = hashU32(h)
        const vx = dx + to01(h) - fx
        const vy = dy + to01(h2) - fy
        const vz = dz + to01(hashU32(h2)) - fz
        const d = Math.max(Math.abs(vx), Math.abs(vy), Math.abs(vz))
        if (d < f1) f1 = d
      }
    }
  }
  return f1
}

/** Worley (Manhattan) 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const worleyManhattan2dCanonical = (x: number, y: number): number => MANHATTAN2_NORM * manhattan2(x, y)

/** Worley (Manhattan) 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const worleyManhattan3dCanonical = (x: number, y: number, z: number): number =>
  MANHATTAN3_NORM * manhattan3(x, y, z)

/** Worley (Chebyshev) 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const worleyChebyshev2dCanonical = (x: number, y: number): number => CHEBYSHEV2_NORM * chebyshev2(x, y)

/** Worley (Chebyshev) 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const worleyChebyshev3dCanonical = (x: number, y: number, z: number): number =>
  CHEBYSHEV3_NORM * chebyshev3(x, y, z)
