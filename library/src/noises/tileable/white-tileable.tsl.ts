// TSL counterpart of white-tileable.ts. Requires COMMON_TSL.

import { COMMON_TSL } from '../common.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const WHITE_TILEABLE_TSL = /* js */ `
const white2T = Fn(([p, per]) => {
  const i = floor(p)
  const x0 = imod(int(i.x), int(per.x)).toVar()
  const y0 = imod(int(i.y), int(per.y)).toVar()
  return to01(hash2u(x0, y0))
})

const white3T = Fn(([p, per]) => {
  const i = floor(p)
  const x0 = imod(int(i.x), int(per.x)).toVar()
  const y0 = imod(int(i.y), int(per.y)).toVar()
  return to01(hash3u(x0, y0, int(i.z)))
})
`

/** White 2D (Canonical), tileable — TSL shader spec. */
export const white2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WHITE_TILEABLE_TSL],
  expr: 'white2T(p, per)',
}

/** White 3D (Canonical), tileable — TSL shader spec. */
export const white3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WHITE_TILEABLE_TSL],
  expr: 'white3T(p, per)',
}
