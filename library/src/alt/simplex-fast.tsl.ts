// TSL counterpart of simplex-fast.ts. Requires COMMON_TSL and FAST_COMMON_TSL.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { SIMPLEX2_NORM, SIMPLEX3_NORM } from '../noises/normalization.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const SIMPLEX_FAST_TSL = /* js */ `
const simplexFastContrib2 = Fn(([d, h]) => {
  const t = float(0.5).sub(dot(d, d)).toVar()
  const r = float(0).toVar()
  If(t.greaterThan(0), () => {
    const t2 = t.mul(t)
    r.assign(t2.mul(t2).mul(gradFastDiag2(h, d)))
  })
  return r
})

const simplexFastContrib3 = Fn(([d, h]) => {
  const t = float(0.5).sub(dot(d, d)).toVar()
  const r = float(0).toVar()
  If(t.greaterThan(0), () => {
    const t2 = t.mul(t)
    r.assign(t2.mul(t2).mul(gradFast3(h, d)))
  })
  return r
})

const simplexFast2 = Fn(([p]) => {
  const F2 = 0.3660254037844386
  const G2 = 0.21132486540518713
  const s = p.x.add(p.y).mul(F2)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const t = float(i.add(j)).mul(G2)
  const d0 = p.sub(vec2(float(i), float(j)).sub(t)).toVar()
  const i1 = select(d0.x.greaterThan(d0.y), int(1), int(0)).toVar()
  const d1 = d0.sub(vec2(float(i1), float(int(1).sub(i1)))).add(G2)
  const d2 = d0.sub(1).add(2 * 0.21132486540518713)
  const s0 = uint(i).mul(LATTICE_HX).add(uint(j).mul(LATTICE_HY)).toVar()
  const s2 = s0.add(LATTICE_HX).add(LATTICE_HY).toVar()
  const s1 = s0.add(select(i1.equal(int(1)), LATTICE_HX, LATTICE_HY)).toVar()
  return simplexFastContrib2(d0, fibMix(s0))
    .add(simplexFastContrib2(d1, fibMix(s1)))
    .add(simplexFastContrib2(d2, fibMix(s2)))
})

const simplexFast3 = Fn(([p]) => {
  const F3 = 1 / 3
  const G3 = 1 / 6
  const s = p.x.add(p.y).add(p.z).mul(F3)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const k = int(floor(p.z.add(s))).toVar()
  const t = float(i.add(j).add(k)).mul(G3)
  const d0 = p.sub(vec3(float(i), float(j), float(k)).sub(t)).toVar()
  const a = select(d0.x.greaterThanEqual(d0.y), int(1), int(0)).toVar()
  const b = select(d0.y.greaterThanEqual(d0.z), int(1), int(0)).toVar()
  const c = select(d0.x.greaterThanEqual(d0.z), int(1), int(0)).toVar()
  const na = int(1).sub(a).toVar()
  const nb = int(1).sub(b).toVar()
  const nc = int(1).sub(c).toVar()
  const i1 = a.bitAnd(b.bitOr(c)).toVar()
  const j1 = na.bitAnd(b).toVar()
  const k1 = nb.bitAnd(na.bitOr(nc)).toVar()
  const i2 = a.bitOr(b.bitAnd(c)).toVar()
  const j2 = na.bitOr(b).toVar()
  const k2 = nb.bitOr(na.bitAnd(nc)).toVar()
  const d1 = d0.sub(vec3(float(i1), float(j1), float(k1))).add(G3)
  const d2 = d0.sub(vec3(float(i2), float(j2), float(k2))).add(2 / 6)
  const d3 = d0.sub(1).add(3 / 6)
  const h0 = uint(i).mul(LATTICE_HX).add(uint(j).mul(LATTICE_HY)).add(uint(k).mul(LATTICE_HZ)).toVar()
  const h3 = h0.add(LATTICE_HX).add(LATTICE_HY).add(LATTICE_HZ).toVar()
  const h1 = h0.add(select(i1.equal(int(1)), LATTICE_HX, select(j1.equal(int(1)), LATTICE_HY, LATTICE_HZ))).toVar()
  const h2 = h3.sub(select(i2.equal(int(0)), LATTICE_HX, select(j2.equal(int(0)), LATTICE_HY, LATTICE_HZ))).toVar()
  return simplexFastContrib3(d0, lmfMix(h0))
    .add(simplexFastContrib3(d1, lmfMix(h1)))
    .add(simplexFastContrib3(d2, lmfMix(h2)))
    .add(simplexFastContrib3(d3, lmfMix(h3)))
})
`

/** Simplex 2D Fast (fast-hash candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const simplex2dFastTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, SIMPLEX_FAST_TSL],
  expr: `simplexFast2(p).mul(${0.5 * SIMPLEX2_NORM}).add(0.5)`,
}

/** Simplex 3D Fast (fast-hash candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const simplex3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, SIMPLEX_FAST_TSL],
  expr: `simplexFast3(p).mul(${0.5 * SIMPLEX3_NORM}).add(0.5)`,
}
