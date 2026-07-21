// TSL counterpart of simplex-tileable.ts (4D torus trick).
// Requires COMMON_TSL and SIMPLEX4_TSL.

import { COMMON_TSL } from '../common.tsl.js'
import { SIMPLEX4_NORM } from '../normalization.js'
import { SIMPLEX4_TSL } from '../simplex4.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const SIMPLEX_TILEABLE_TSL = /* js */ `
const simplex2T = Fn(([p, per]) => {
  const a = p.div(per).mul(6.283185307179586)
  const r = per.div(6.283185307179586)
  return simplex4(vec4(r.x.mul(cos(a.x)), r.x.mul(sin(a.x)), r.y.mul(cos(a.y)), r.y.mul(sin(a.y))))
})
`

/** Simplex 2D (Canonical), tileable (4D torus) — TSL shader spec. */
export const simplex2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, SIMPLEX4_TSL, SIMPLEX_TILEABLE_TSL],
  expr: `simplex2T(p, per).mul(${0.5 * SIMPLEX4_NORM}).add(0.5)`,
}
