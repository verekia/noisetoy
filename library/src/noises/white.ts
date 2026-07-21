// White noise: one independent hashed value per lattice cell, with no
// interpolation at all. The spectral opposite of every other noise here —
// neighbouring cells are uncorrelated, so the power spectrum is flat.
// Original implementation (MIT); hashed-cell white noise is folklore.
//
// Because it is piecewise constant, the sampled field is only "white" at the
// lattice frequency: at a default scale of one cell per pixel it reads as film
// grain, and at a low scale it reads as coarse blocks. It band-limits nothing,
// so minifying it aliases — that is inherent to white noise, not to this
// implementation. Output is naturally in [0, 1).

import { hash2, hash3, to01 } from './common.js'

export const white2 = (x: number, y: number): number => to01(hash2(Math.floor(x), Math.floor(y)))

export const white3 = (x: number, y: number, z: number): number =>
  to01(hash3(Math.floor(x), Math.floor(y), Math.floor(z)))

/** White 2D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const white2dCanonical = white2

/** White 3D, shipping implementation — display value, nominally [0, 1], unclamped. */
export const white3dCanonical = white3
