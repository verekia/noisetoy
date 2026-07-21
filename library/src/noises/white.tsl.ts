// TSL counterpart of white.ts. Requires COMMON_TSL.

import { COMMON_TSL } from './common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const WHITE_TSL = /* js */ `
const white2 = Fn(([p]) => {
  const i = floor(p)
  return to01(hash2u(int(i.x), int(i.y)))
})

const white3 = Fn(([p]) => {
  const i = floor(p)
  return to01(hash3u(int(i.x), int(i.y), int(i.z)))
})
`

/** White 2D (Canonical) — TSL shader spec. */
export const white2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WHITE_TSL],
  expr: 'white2(p)',
}

/** White 3D (Canonical) — TSL shader spec. */
export const white3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WHITE_TSL],
  expr: 'white3(p)',
}
