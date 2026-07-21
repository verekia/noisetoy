// TSL counterpart of gabor-fast.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL. See the GLSL file for the constant notes. Cell helpers
// take and return the running sum, like the ripple candidate's.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { GABOR2_NORM, GABOR3_NORM } from '../noises/normalization.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const GABOR_FAST_TSL = /* js */ `
const gbrFastCell2 = Fn(([s, b, sumIn]) => {
  const sum = float(sumIn).toVar()
  const h = fibMix(s).toVar()
  h.assign(h.bitXor(h.shiftRight(uint(16))))
  const v = b
    .add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
    .toVar()
  const d2 = dot(v, v).toVar()
  If(d2.lessThan(2.25), () => {
    const bh = h.bitXor(h.shiftRight(uint(15))).mul(ALT_FIB).toVar()
    const w = float(bh.shiftRight(uint(10)).bitAnd(uint(255))).mul(1 / 128).sub(1)
    const ph = float(bh.shiftRight(uint(18)).bitAnd(uint(255))).mul(0.02454369260617026)
    const a = float(bh.shiftRight(uint(26))).mul(0.09817477042468103).toVar()
    const proj = dot(vec2(cos(a), sin(a)), v)
    sum.addAssign(w.mul(exp(d2.mul(-3.141592653589793))).mul(cos(proj.mul(12.566370614359172).add(ph))))
  })
  return sum
})

const gaborFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    const yh = yc.add(uint(dy).mul(LATTICE_HY)).toVar()
    const by = float(dy).sub(f.y).toVar()
    sum.assign(gbrFastCell2(xc.sub(LATTICE_HX).add(yh), vec2(f.x.negate().sub(1), by), sum))
    sum.assign(gbrFastCell2(xc.add(yh), vec2(f.x.negate(), by), sum))
    sum.assign(gbrFastCell2(xc.add(LATTICE_HX).add(yh), vec2(f.x.oneMinus(), by), sum))
  })
  return sum
})

const gbrFastCell3 = Fn(([s, b, sumIn]) => {
  const sum = float(sumIn).toVar()
  const h = lowbias32(s).toVar()
  const v = b
    .add(
      vec3(
        float(h.shiftRight(uint(22))),
        float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
        float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
      ).mul(1 / 1024),
    )
    .toVar()
  const d2 = dot(v, v).toVar()
  If(d2.lessThan(2.25), () => {
    const bh = h.bitXor(h.shiftRight(uint(15))).mul(ALT_FIB).toVar()
    const w = float(bh.shiftRight(uint(2)).bitAnd(uint(255))).mul(1 / 128).sub(1)
    const ph = float(bh.shiftRight(uint(10)).bitAnd(uint(255))).mul(0.02454369260617026)
    const a = float(bh.shiftRight(uint(20)).bitAnd(uint(63))).mul(0.09817477042468103).toVar()
    const kz = float(bh.shiftRight(uint(26))).mul(0.03125).sub(0.984375).toVar()
    const r = sqrt(kz.mul(kz).oneMinus()).toVar()
    const proj = dot(vec3(r.mul(cos(a)), r.mul(sin(a)), kz), v)
    sum.addAssign(w.mul(exp(d2.mul(-3.141592653589793))).mul(cos(proj.mul(12.566370614359172).add(ph))))
  })
  return sum
})

const gaborFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    const zh = zc.add(uint(dz).mul(LATTICE_HZ)).toVar()
    const bz = float(dz).sub(f.z).toVar()
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      const yh = yc.add(uint(dy).mul(LATTICE_HY)).add(zh).toVar()
      const by = float(dy).sub(f.y).toVar()
      sum.assign(gbrFastCell3(xc.sub(LATTICE_HX).add(yh), vec3(f.x.negate().sub(1), by, bz), sum))
      sum.assign(gbrFastCell3(xc.add(yh), vec3(f.x.negate(), by, bz), sum))
      sum.assign(gbrFastCell3(xc.add(LATTICE_HX).add(yh), vec3(f.x.oneMinus(), by, bz), sum))
    })
  })
  return sum
})
`

/** Gabor 2D Fast (split-bits-gated candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const gabor2dFastTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, GABOR_FAST_TSL],
  expr: `gaborFast2(p).mul(${0.5 * GABOR2_NORM}).add(0.5)`,
}

/** Gabor 3D Fast (split-bits-gated candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const gabor3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, GABOR_FAST_TSL],
  expr: `gaborFast3(p).mul(${0.5 * GABOR3_NORM}).add(0.5)`,
}
