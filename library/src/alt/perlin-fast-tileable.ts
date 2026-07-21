// Tileable counterpart of the fib-hash Perlin candidate (perlin-fast.ts),
// 3D. Lattice coordinates are wrapped modulo an integer period in x and y
// BEFORE the fold, exactly as noises/tileable/perlin-tileable.ts does for
// the shipping implementation — the candidate changed how a folded cell
// becomes a gradient, not which cell gets folded, so wrap-then-fold tiles
// for the same reason wrap-then-hash does.
//
// What wrapping costs the fast path: the core's "(i + 1) * K == i * K + K"
// neighbour shortcut does not survive the seam — imod(i + 1) is 0 there,
// not imod(i) + 1 — so each wrapped axis pays an imod and a real multiply
// for its far plane. z is not wrapped and keeps the shortcut. That is the
// same overhead the shipping tileable path pays over its own core, so the
// candidate's margin over shipping carries across (measured in bench.ts's
// 'Perlin 3D tileable' compare).
//
// The corner mix is grad3 from perlin-fast.ts, unchanged: the 7-offset
// statistical battery quoted there was run on lattice products, and
// wrapping only restricts WHICH products occur (a px x py x open-z subset),
// exactly as it does for the shipping hash.
//
// 3D only for now: the 2D candidate hoists its pre-mix across the row
// (rx = x0 ^ (x0 >>> 16) shared by both x planes), which survives wrapping
// fine — it just has not been written or measured yet.

import { fade, imod, LATTICE_HX, LATTICE_HY, LATTICE_HZ, lerp } from '../noises/common'
import { grad3 } from './perlin-fast'

export const perlinFastTileable3 = (x: number, y: number, z: number, px: number, py: number): number => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const fx1 = fx - 1
  const fy1 = fy - 1
  const fz1 = fz - 1
  const ux = fade(fx)
  const uy = fade(fy)
  const uz = fade(fz)
  const x0 = Math.imul(imod(ix, px), LATTICE_HX)
  const x1 = Math.imul(imod(ix + 1, px), LATTICE_HX)
  const y0 = Math.imul(imod(iy, py), LATTICE_HY)
  const y1 = Math.imul(imod(iy + 1, py), LATTICE_HY)
  const z0 = Math.imul(iz, LATTICE_HZ)
  const z1 = (z0 + LATTICE_HZ) | 0
  const xy00 = (x0 + y0) | 0
  const xy10 = (x1 + y0) | 0
  const xy01 = (x0 + y1) | 0
  const xy11 = (x1 + y1) | 0
  const g000 = grad3((xy00 + z0) | 0, fx, fy, fz)
  const g100 = grad3((xy10 + z0) | 0, fx1, fy, fz)
  const g010 = grad3((xy01 + z0) | 0, fx, fy1, fz)
  const g110 = grad3((xy11 + z0) | 0, fx1, fy1, fz)
  const g001 = grad3((xy00 + z1) | 0, fx, fy, fz1)
  const g101 = grad3((xy10 + z1) | 0, fx1, fy, fz1)
  const g011 = grad3((xy01 + z1) | 0, fx, fy1, fz1)
  const g111 = grad3((xy11 + z1) | 0, fx1, fy1, fz1)
  const nz0 = lerp(lerp(g000, g100, ux), lerp(g010, g110, ux), uy)
  const nz1 = lerp(lerp(g001, g101, ux), lerp(g011, g111, ux), uy)
  return lerp(nz0, nz1, uz)
}
