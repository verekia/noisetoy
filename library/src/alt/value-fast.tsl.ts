// TSL counterpart of value-fast.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const VALUE_FAST_TSL = /* js */ `
const valFastCorner2 = Fn(([s]) => {
  const h = fibMix(s).toVar()
  h.assign(h.bitXor(h.shiftRight(uint(16))))
  return float(h.shiftRight(uint(16))).mul(1 / 65536)
})

const valFastCorner3 = Fn(([s]) => {
  return float(lowbias32(s).shiftRight(uint(8))).mul(1 / 16777216)
})

const valueFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const n00 = valFastCorner2(x0.add(y0))
  const n10 = valFastCorner2(x1.add(y0))
  const n01 = valFastCorner2(x0.add(y1))
  const n11 = valFastCorner2(x1.add(y1))
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy)
})

const valueFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const uz = fade(f.z).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const n000 = valFastCorner3(x0.add(y0).add(z0))
  const n100 = valFastCorner3(x1.add(y0).add(z0))
  const n010 = valFastCorner3(x0.add(y1).add(z0))
  const n110 = valFastCorner3(x1.add(y1).add(z0))
  const n001 = valFastCorner3(x0.add(y0).add(z1))
  const n101 = valFastCorner3(x1.add(y0).add(z1))
  const n011 = valFastCorner3(x0.add(y1).add(z1))
  const n111 = valFastCorner3(x1.add(y1).add(z1))
  const nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy)
  const nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy)
  return mix(nz0, nz1, uz)
})
`

/** Value 2D Fast (fib-hash candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const value2dFastTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, VALUE_FAST_TSL],
  expr: 'valueFast2(p)',
}

/** Value 3D Fast (fib-hash candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const value3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, VALUE_FAST_TSL],
  expr: 'valueFast3(p)',
}
