// TSL counterpart of flow-fast.ts. Requires COMMON_TSL and FAST_COMMON_TSL.
// Note TSL's select(condition, ifTrue, ifFalse) argument order.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { PERLIN2_NORM } from '../noises/normalization.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const FLOW_FAST_TSL = /* js */ `
const flowFastCorner = Fn(([h, d, c1, s1, c2, s2]) => {
  const dir = uint(h).shiftRight(uint(29)).toVar()
  const S8 = 0.7071067811865476
  const diagX = select(dir.equal(uint(1)).or(dir.equal(uint(7))), float(S8), float(-S8))
  const diagY = select(dir.equal(uint(1)).or(dir.equal(uint(3))), float(S8), float(-S8))
  const gx = select(
    dir.equal(uint(0)),
    float(1),
    select(dir.equal(uint(4)), float(-1), select(dir.bitAnd(uint(1)).equal(uint(0)), float(0), diagX)),
  ).toVar()
  const gy = select(
    dir.equal(uint(2)),
    float(1),
    select(dir.equal(uint(6)), float(-1), select(dir.bitAnd(uint(1)).equal(uint(0)), float(0), diagY)),
  ).toVar()
  const p = gx.mul(d.x).add(gy.mul(d.y))
  const q = gx.mul(d.y).sub(gy.mul(d.x))
  const slow = uint(h).bitAnd(uint(0x10000000)).equal(uint(0)).toVar()
  const ck = select(slow, c1, c2)
  const sk = select(slow, s1, s2)
  return ck.mul(p).add(select(uint(h).bitAnd(uint(0x08000000)).equal(uint(0)), sk, sk.negate()).mul(q))
})

const flowFast3 = Fn(([p]) => {
  const i = floor(p.xy)
  const f = p.xy.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const ph = p.z.mul(6.283185307179586)
  const c1 = cos(ph).toVar()
  const s1 = sin(ph).toVar()
  const c2 = c1.mul(c1).sub(s1.mul(s1)).toVar()
  const s2 = s1.mul(c1).mul(2).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const rx0 = x0.bitXor(x0.shiftRight(uint(16))).toVar()
  const rx1 = x1.bitXor(x1.shiftRight(uint(16))).toVar()
  const n00 = flowFastCorner(rx0.bitXor(y0).mul(ALT_FIB), f, c1, s1, c2, s2)
  const n10 = flowFastCorner(rx1.bitXor(y0).mul(ALT_FIB), f.sub(vec2(1, 0)), c1, s1, c2, s2)
  const n01 = flowFastCorner(rx0.bitXor(y1).mul(ALT_FIB), f.sub(vec2(0, 1)), c1, s1, c2, s2)
  const n11 = flowFastCorner(rx1.bitXor(y1).mul(ALT_FIB), f.sub(vec2(1, 1)), c1, s1, c2, s2)
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy)
})
`

/** Flow 3D Fast (fast-rot candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const flow3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, FLOW_FAST_TSL],
  expr: `flowFast3(p).mul(${0.5 * PERLIN2_NORM}).add(0.5)`,
}
