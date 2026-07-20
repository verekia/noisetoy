// Seamlessly looping simplex noise: 2D space plus a third input that closes on
// itself. The x/y plane is embedded in 4D and the third input drives a CIRCLE
// in the remaining two dimensions, so the field returns exactly to itself every
// 1 unit — the same torus trick simplex-tileable.ts uses to tile space, applied
// to time instead. Original implementation (MIT), on top of the 4D simplex in
// simplex4.ts (Perlin 2001; US patent 6,867,776 expired January 2022).
//
// This is what the repo's ordinary 3D variants cannot do: sliding a z slice
// through a 3D volume never comes back, so an animation built on it can only be
// cut, never looped. Here, at the renderer's Z_SPEED of 0.25, the loop is
// exactly four seconds.
//
// Not tileable: two of the four dimensions are already spent on the time
// circle, so also wrapping x and y would need 6D noise, where the simplex
// kernel quality degrades.

import { simplex4 } from './simplex4'

const TAU = 6.283185307179586

/**
 * Radius of the time circle. Its circumference is 1 lattice unit, so one loop
 * travels as far through noise space as a 3D variant does over dz = 1 — the
 * pattern churns at the same rate the other 3D noises do, it just returns.
 */
export const LOOP_RADIUS = 0.15915494309189535 // 1 / TAU

export const simplexLoop3 = (x: number, y: number, z: number): number => {
  const a = z * TAU
  return simplex4(x, y, LOOP_RADIUS * Math.cos(a), LOOP_RADIUS * Math.sin(a))
}
