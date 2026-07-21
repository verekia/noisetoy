// TSL counterpart of worley-tileable.ts. Requires COMMON_TSL.

import { COMMON_TSL } from '../common.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const WORLEY_TILEABLE_TSL = /* js */ `
const worley2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const o = vec2(to01(h), to01(lowbias32(h)))
      const v = vec2(float(dx), float(dy)).add(o).sub(f)
      f1.assign(f1.min(dot(v, v)))
    })
  })
  return sqrt(f1)
})

const worley3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const o = vec3(to01(h), to01(h2), to01(lowbias32(h2)))
        const v = vec3(float(dx), float(dy), float(dz)).add(o).sub(f)
        f1.assign(f1.min(dot(v, v)))
      })
    })
  })
  return sqrt(f1)
})
`

/** Worley 2D (Canonical), tileable — TSL shader spec. */
export const worley2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WORLEY_TILEABLE_TSL],
  expr: 'worley2T(p, per)',
}

/** Worley 3D (Canonical), tileable — TSL shader spec. */
export const worley3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WORLEY_TILEABLE_TSL],
  expr: 'worley3T(p, per)',
}
