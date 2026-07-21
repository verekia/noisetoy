// TSL counterpart of ripple-tileable.ts. Requires COMMON_TSL.

import { COMMON_TSL } from '../common.tsl.js'
import { RIPPLE_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const RIPPLE_TILEABLE_TSL = /* js */ `
const ripple2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const h2 = lowbias32(h)
      const o = vec2(to01(h), to01(h2))
      const ph = to01(lowbias32(h2)).mul(6.283185307179586)
      const v = vec2(float(dx), float(dy)).add(o).sub(f)
      const d = length(v)
      const w = d.div(1.5).oneMinus().max(0)
      sum.addAssign(w.mul(w).mul(cos(d.mul(15).sub(ph))))
    })
  })
  return sum
})

const ripple3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const h3 = lowbias32(h2)
        const o = vec3(to01(h), to01(h2), to01(h3))
        const ph = to01(lowbias32(h3)).mul(6.283185307179586)
        const v = vec3(float(dx), float(dy), float(dz)).add(o).sub(f)
        const d = length(v)
        const w = d.div(1.5).oneMinus().max(0)
        sum.addAssign(w.mul(w).mul(cos(d.mul(15).sub(ph))))
      })
    })
  })
  return sum
})
`

/** Ripple 2D (Canonical), tileable — TSL shader spec. */
export const ripple2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, RIPPLE_TILEABLE_TSL],
  expr: `ripple2T(p, per).mul(${0.5 * RIPPLE_NORM}).add(0.5)`,
}

/** Ripple 3D (Canonical), tileable — TSL shader spec. */
export const ripple3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, RIPPLE_TILEABLE_TSL],
  expr: `ripple3T(p, per).mul(${0.5 * RIPPLE_NORM}).add(0.5)`,
}
