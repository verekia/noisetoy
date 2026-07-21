// Tileable 2D simplex via the 4D torus trick: map the tile domain onto a
// torus embedded in 4D (x -> a circle in the first two dimensions, y -> a
// circle in the last two) and sample 4D simplex noise there. Radii are chosen
// as period / 2pi so arc length equals the input coordinate and feature size
// matches the untiled noise. The result is exactly periodic in x and y.
//
// Unlike the lattice-wrapping tileable paths, this produces a different
// pattern than the core 2D simplex (it samples a different noise space).
// The 3D variant is not tileable this way: tiling x/y with a free z would
// require 5D noise (6D to also wrap z), where the simplex kernel quality
// degrades. This trickery is deliberately kept out of the core implementation.

import { SIMPLEX4_NORM } from '../normalization.js'
import { simplex4 } from '../simplex4.js'

const TAU = 6.283185307179586

export const simplex2TileableTorus = (x: number, y: number, px: number, py: number): number => {
  const ax = (x / px) * TAU
  const ay = (y / py) * TAU
  const rx = px / TAU
  const ry = py / TAU
  return simplex4(rx * Math.cos(ax), rx * Math.sin(ax), ry * Math.cos(ay), ry * Math.sin(ay))
}

/** Simplex 2D tileable (torus embedding), shipping implementation — wraps every periodX / periodY lattice cells; display value, nominally [0, 1], unclamped. */
export const simplex2dCanonicalTileable = (x: number, y: number, periodX: number, periodY: number): number =>
  0.5 + 0.5 * SIMPLEX4_NORM * simplex2TileableTorus(x, y, periodX, periodY)
