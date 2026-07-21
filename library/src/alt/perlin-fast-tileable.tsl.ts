// TSL counterpart of perlin-fast-tileable.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL. Period baked at 8 cells; the wrap is bitAnd(7) on the
// signed lattice coordinate.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { PERLIN2_NORM, PERLIN3_NORM } from '../noises/normalization.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_FAST_TILEABLE_TSL = /* js */ `
const perlinFastT2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const s = f.x.add(f.y).toVar()
  const d = f.x.sub(f.y).toVar()
  const s1 = s.sub(1).toVar()
  const x0 = uint(int(i.x).bitAnd(int(7))).mul(LATTICE_HX).toVar()
  const x1 = uint(int(i.x).add(1).bitAnd(int(7))).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y).bitAnd(int(7))).mul(LATTICE_HY).toVar()
  const y1 = uint(int(i.y).add(1).bitAnd(int(7))).mul(LATTICE_HY).toVar()
  const rx0 = x0.bitXor(x0.shiftRight(uint(16))).toVar()
  const rx1 = x1.bitXor(x1.shiftRight(uint(16))).toVar()
  const g00 = pickSD(rx0.bitXor(y0).mul(ALT_FIB), s, d)
  const g10 = pickSD(rx1.bitXor(y0).mul(ALT_FIB), s1, d.sub(1))
  const g01 = pickSD(rx0.bitXor(y1).mul(ALT_FIB), s1, d.add(1))
  const g11 = pickSD(rx1.bitXor(y1).mul(ALT_FIB), s.sub(2), d)
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy)
})

const perlinFastT3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const uz = fade(f.z).toVar()
  const x0 = uint(int(i.x).bitAnd(int(7))).mul(LATTICE_HX).toVar()
  const x1 = uint(int(i.x).add(1).bitAnd(int(7))).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y).bitAnd(int(7))).mul(LATTICE_HY).toVar()
  const y1 = uint(int(i.y).add(1).bitAnd(int(7))).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const xy00 = x0.add(y0).toVar()
  const xy10 = x1.add(y0).toVar()
  const xy01 = x0.add(y1).toVar()
  const xy11 = x1.add(y1).toVar()
  const g000 = gradFast3(lmfMix(xy00.add(z0)), f)
  const g100 = gradFast3(lmfMix(xy10.add(z0)), f.sub(vec3(1, 0, 0)))
  const g010 = gradFast3(lmfMix(xy01.add(z0)), f.sub(vec3(0, 1, 0)))
  const g110 = gradFast3(lmfMix(xy11.add(z0)), f.sub(vec3(1, 1, 0)))
  const g001 = gradFast3(lmfMix(xy00.add(z1)), f.sub(vec3(0, 0, 1)))
  const g101 = gradFast3(lmfMix(xy10.add(z1)), f.sub(vec3(1, 0, 1)))
  const g011 = gradFast3(lmfMix(xy01.add(z1)), f.sub(vec3(0, 1, 1)))
  const g111 = gradFast3(lmfMix(xy11.add(z1)), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy)
  const nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy)
  return mix(nz0, nz1, uz)
})
`

/** Perlin 2D Fast, tileable at a baked period of 8 cells (fib-hash-tileable candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const perlin2dFastTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, PERLIN_FAST_TILEABLE_TSL],
  expr: `perlinFastT2(p).mul(${0.5 * PERLIN2_NORM}).add(0.5)`,
}

/** Perlin 3D Fast, x/y tileable at a baked period of 8 cells (fib-hash-tileable candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const perlin3dFastTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, PERLIN_FAST_TILEABLE_TSL],
  expr: `perlinFastT3(p).mul(${0.5 * PERLIN3_NORM}).add(0.5)`,
}
