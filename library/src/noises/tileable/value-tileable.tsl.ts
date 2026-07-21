// TSL counterpart of value-tileable.ts. Requires COMMON_TSL.

import { COMMON_TSL } from '../common.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const VALUE_TILEABLE_TSL = /* js */ `
const value2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ux = fade(f.x)
  const uy = fade(f.y)
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = imod(int(i.x), px).toVar()
  const x1 = imod(int(i.x).add(1), px).toVar()
  const y0 = imod(int(i.y), py).toVar()
  const y1 = imod(int(i.y).add(1), py).toVar()
  const n00 = to01(hash2u(x0, y0))
  const n10 = to01(hash2u(x1, y0))
  const n01 = to01(hash2u(x0, y1))
  const n11 = to01(hash2u(x1, y1))
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy)
})

const value3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ux = fade(f.x)
  const uy = fade(f.y)
  const uz = fade(f.z)
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = imod(int(i.x), px).toVar()
  const x1 = imod(int(i.x).add(1), px).toVar()
  const y0 = imod(int(i.y), py).toVar()
  const y1 = imod(int(i.y).add(1), py).toVar()
  const iz = int(i.z).toVar()
  const n000 = to01(hash3u(x0, y0, iz))
  const n100 = to01(hash3u(x1, y0, iz))
  const n010 = to01(hash3u(x0, y1, iz))
  const n110 = to01(hash3u(x1, y1, iz))
  const n001 = to01(hash3u(x0, y0, iz.add(1)))
  const n101 = to01(hash3u(x1, y0, iz.add(1)))
  const n011 = to01(hash3u(x0, y1, iz.add(1)))
  const n111 = to01(hash3u(x1, y1, iz.add(1)))
  const nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy)
  const nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy)
  return mix(nz0, nz1, uz)
})
`

/** Value 2D (Canonical), tileable — TSL shader spec. */
export const value2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, VALUE_TILEABLE_TSL],
  expr: 'value2T(p, per)',
}

/** Value 3D (Canonical), tileable — TSL shader spec. */
export const value3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, VALUE_TILEABLE_TSL],
  expr: 'value3T(p, per)',
}
