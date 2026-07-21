// TSL counterpart of simplex-value-tileable.ts (4D torus trick with value
// contributions). Requires COMMON_TSL. Self-contained like its GLSL/WGSL
// counterparts (does not require the gradient-based SIMPLEX4_TSL).

import { COMMON_TSL } from '../common.tsl.js'
import { SIMPLEX_VALUE4_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const SIMPLEX_VALUE_TILEABLE_TSL = /* js */ `
const contribV4 = Fn(([d, h]) => {
  const t = float(0.6).sub(dot(d, d)).toVar()
  const r = float(0).toVar()
  If(t.greaterThan(0), () => {
    const t2 = t.mul(t)
    r.assign(t2.mul(t2).mul(to01(h).mul(2).sub(1)))
  })
  return r
})

const simplexValue4 = Fn(([p]) => {
  const F4 = 0.30901699437494745
  const s = p.x.add(p.y).add(p.z).add(p.w).mul(F4)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const k = int(floor(p.z.add(s))).toVar()
  const l = int(floor(p.w.add(s))).toVar()
  const t = float(i.add(j).add(k).add(l)).mul(0.1381966011250105)
  const d0 = p.sub(vec4(float(i), float(j), float(k), float(l)).sub(t)).toVar()
  const rankx = int(0).toVar()
  const ranky = int(0).toVar()
  const rankz = int(0).toVar()
  const rankw = int(0).toVar()
  If(d0.x.greaterThan(d0.y), () => rankx.addAssign(1)).Else(() => ranky.addAssign(1))
  If(d0.x.greaterThan(d0.z), () => rankx.addAssign(1)).Else(() => rankz.addAssign(1))
  If(d0.x.greaterThan(d0.w), () => rankx.addAssign(1)).Else(() => rankw.addAssign(1))
  If(d0.y.greaterThan(d0.z), () => ranky.addAssign(1)).Else(() => rankz.addAssign(1))
  If(d0.y.greaterThan(d0.w), () => ranky.addAssign(1)).Else(() => rankw.addAssign(1))
  If(d0.z.greaterThan(d0.w), () => rankz.addAssign(1)).Else(() => rankw.addAssign(1))
  const i1 = select(rankx.greaterThanEqual(3), int(1), int(0))
  const j1 = select(ranky.greaterThanEqual(3), int(1), int(0))
  const k1 = select(rankz.greaterThanEqual(3), int(1), int(0))
  const l1 = select(rankw.greaterThanEqual(3), int(1), int(0))
  const i2 = select(rankx.greaterThanEqual(2), int(1), int(0))
  const j2 = select(ranky.greaterThanEqual(2), int(1), int(0))
  const k2 = select(rankz.greaterThanEqual(2), int(1), int(0))
  const l2 = select(rankw.greaterThanEqual(2), int(1), int(0))
  const i3 = select(rankx.greaterThanEqual(1), int(1), int(0))
  const j3 = select(ranky.greaterThanEqual(1), int(1), int(0))
  const k3 = select(rankz.greaterThanEqual(1), int(1), int(0))
  const l3 = select(rankw.greaterThanEqual(1), int(1), int(0))
  const d1 = d0.sub(vec4(float(i1), float(j1), float(k1), float(l1))).add(0.1381966011250105)
  const d2 = d0.sub(vec4(float(i2), float(j2), float(k2), float(l2))).add(2 * 0.1381966011250105)
  const d3 = d0.sub(vec4(float(i3), float(j3), float(k3), float(l3))).add(3 * 0.1381966011250105)
  const d4 = d0.sub(1).add(4 * 0.1381966011250105)
  return contribV4(d0, hash4u(i, j, k, l))
    .add(contribV4(d1, hash4u(i.add(i1), j.add(j1), k.add(k1), l.add(l1))))
    .add(contribV4(d2, hash4u(i.add(i2), j.add(j2), k.add(k2), l.add(l2))))
    .add(contribV4(d3, hash4u(i.add(i3), j.add(j3), k.add(k3), l.add(l3))))
    .add(contribV4(d4, hash4u(i.add(1), j.add(1), k.add(1), l.add(1))))
})

const simplexValue2T = Fn(([p, per]) => {
  const a = p.div(per).mul(6.283185307179586)
  const r = per.div(6.283185307179586)
  return simplexValue4(vec4(r.x.mul(cos(a.x)), r.x.mul(sin(a.x)), r.y.mul(cos(a.y)), r.y.mul(sin(a.y))))
})
`

/** Simplex Value 2D (Canonical), tileable (4D torus) — TSL shader spec. */
export const simplexValue2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, SIMPLEX_VALUE_TILEABLE_TSL],
  expr: `simplexValue2T(p, per).mul(${0.5 * SIMPLEX_VALUE4_NORM}).add(0.5)`,
}
