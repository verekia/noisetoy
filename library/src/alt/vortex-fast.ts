// Vortex noise tuned for CPU throughput — a candidate implementation of the
// same construction as noises/vortex.ts: hashed unit vectors on the lattice
// corners, blended with the quintic fade, displayed as cos(2 * theta) of the
// blend's angle. Two changes remove EVERY transcendental:
//
// 1. TABLE REST DIRECTIONS, the flow-fast trick at doubled resolution:
//    corner vectors come from SIXTEEN unit directions at 22.5-degree steps
//    (top 4 bits of the fast corner mix, as quadrant rotations of four base
//    vectors) instead of cos/sin of a continuous hashed angle. Eight
//    directions measured visibly blockier — see the constant note below —
//    sixteen restored the shipping character. The blend of four (eight in
//    3D) such vectors under continuous weights still sweeps all angles; the
//    pinwheel singularities where the blend cancels remain. In 3D, the
//    shipping projection of a uniform sphere direction (length
//    sqrt(1 - kz^2), one sqrt per corner) becomes a hashed length in [0, 1)
//    from 10 further bits — a different length distribution, same
//    variable-strength corners, no sqrt.
//
// 2. THE IDENTITY cos(2 * atan2(sy, sx)) = (sx^2 - sy^2) / (sx^2 + sy^2),
//    which replaces the atan2 and the final cos with three multiplies and a
//    divide. The shipping value at an exact zero blend is cos(atan2(0,0)*2)
//    = 1; the candidate returns 1 there too (measure-zero case).
//
// Shipping per sample (2D): 8 lowbias32 rounds, 8 trig calls, an atan2 and a
// cos. Candidate: 4 one-multiply mixes and zero transcendentals.
//
// The 2D corner mix is the validated two-axis scheme; 3D corners consume the
// top 3 bits (direction) and bits 19-28 (length) of a full lowbias32, both
// battery-covered reads. The field is a different draw with the same
// character; see the inventory entry for the measured statistics.

import { fade, LATTICE_HX, LATTICE_HY, LATTICE_HZ } from '../noises/common'

/** 2^32 / phi, odd — Knuth's multiplicative hashing constant. */
const FIB = 0x9e3779b1
const INV10 = 1 / 1024
// cos of 22.5 and 67.5 degrees; with 0.70711 these span 16 unit directions
// as quadrant rotations of four base vectors. Eight directions measured
// visibly blockier: adjacent corners share one of 8 angles once in 8 cells,
// which locks cos(2 theta) flat across the shared edge. One in 16 is below
// the shipping field's own plateau rate to the eye.
const C1 = 0.9238795325112867
const C3 = 0.3826834323650898
const S45 = 0.7071067811865476

/**
 * One of 16 unit directions from the top 4 bits of h, accumulated into the
 * blend as (sx, sy) += w * dir. Quadrant decomposition: bits 30-31 rotate a
 * base vector picked by bits 28-29 by k * 90 degrees — selects only.
 */
const DIRX = [1, C1, S45, C3]
const DIRY = [0, C3, S45, C1]

export const vortexFast2 = (x: number, y: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const rx0 = x0 ^ (x0 >>> 16)
  const rx1 = x1 ^ (x1 >>> 16)
  const vx = 1 - ux
  const vy = 1 - uy
  let sx = 0
  let sy = 0
  let h = 0
  let w = 0
  let bx = 0
  let by = 0
  let q = 0
  {
    h = Math.imul(rx0 ^ y0, FIB)
    w = vx * vy
    bx = DIRX[(h >>> 28) & 3] as number
    by = DIRY[(h >>> 28) & 3] as number
    q = h >>> 30
    sx += w * (q === 0 ? bx : q === 1 ? -by : q === 2 ? -bx : by)
    sy += w * (q === 0 ? by : q === 1 ? bx : q === 2 ? -by : -bx)
  }
  {
    h = Math.imul(rx1 ^ y0, FIB)
    w = ux * vy
    bx = DIRX[(h >>> 28) & 3] as number
    by = DIRY[(h >>> 28) & 3] as number
    q = h >>> 30
    sx += w * (q === 0 ? bx : q === 1 ? -by : q === 2 ? -bx : by)
    sy += w * (q === 0 ? by : q === 1 ? bx : q === 2 ? -by : -bx)
  }
  {
    h = Math.imul(rx0 ^ y1, FIB)
    w = vx * uy
    bx = DIRX[(h >>> 28) & 3] as number
    by = DIRY[(h >>> 28) & 3] as number
    q = h >>> 30
    sx += w * (q === 0 ? bx : q === 1 ? -by : q === 2 ? -bx : by)
    sy += w * (q === 0 ? by : q === 1 ? bx : q === 2 ? -by : -bx)
  }
  {
    h = Math.imul(rx1 ^ y1, FIB)
    w = ux * uy
    bx = DIRX[(h >>> 28) & 3] as number
    by = DIRY[(h >>> 28) & 3] as number
    q = h >>> 30
    sx += w * (q === 0 ? bx : q === 1 ? -by : q === 2 ? -bx : by)
    sy += w * (q === 0 ? by : q === 1 ? bx : q === 2 ? -by : -bx)
  }
  const a = sx * sx
  const b = sy * sy
  const n = a + b
  return n > 0 ? (a - b) / n : 1
}

export const vortexFast3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const ux = fade(x - ix)
  const uy = fade(y - iy)
  const uz = fade(z - iz)
  const x0 = Math.imul(ix, LATTICE_HX)
  const y0 = Math.imul(iy, LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const x1 = (x0 + LATTICE_HX) | 0
  const y1 = (y0 + LATTICE_HY) | 0
  const z1 = (z0 + LATTICE_HZ) | 0
  const xy00 = (x0 + y0) | 0
  const xy10 = (x1 + y0) | 0
  const xy01 = (x0 + y1) | 0
  const xy11 = (x1 + y1) | 0
  const vx = 1 - ux
  const vy = 1 - uy
  const vz = 1 - uz
  const w00 = vx * vy
  const w10 = ux * vy
  const w01 = vx * uy
  const w11 = ux * uy
  let sx = 0
  let sy = 0
  const corner = (s: number, w: number): void => {
    let h = s ^ (s >>> 16)
    h = Math.imul(h, 0x7feb352d)
    h ^= h >>> 15
    h = Math.imul(h, 0x846ca68b)
    h ^= h >>> 16
    const bx = DIRX[(h >>> 28) & 3] as number
    const by = DIRY[(h >>> 28) & 3] as number
    const q = h >>> 30
    const wl = w * ((h >>> 18) & 1023) * INV10
    sx += wl * (q === 0 ? bx : q === 1 ? -by : q === 2 ? -bx : by)
    sy += wl * (q === 0 ? by : q === 1 ? bx : q === 2 ? -by : -bx)
  }
  corner((xy00 + z0) | 0, w00 * vz)
  corner((xy10 + z0) | 0, w10 * vz)
  corner((xy01 + z0) | 0, w01 * vz)
  corner((xy11 + z0) | 0, w11 * vz)
  corner((xy00 + z1) | 0, w00 * uz)
  corner((xy10 + z1) | 0, w10 * uz)
  corner((xy01 + z1) | 0, w01 * uz)
  corner((xy11 + z1) | 0, w11 * uz)
  const a = sx * sx
  const b = sy * sy
  const n = a + b
  return n > 0 ? (a - b) / n : 1
}
