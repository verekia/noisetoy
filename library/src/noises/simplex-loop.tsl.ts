// TSL counterpart of simplex-loop.ts. Requires COMMON_TSL and SIMPLEX4_TSL.

import { COMMON_TSL } from './common.tsl.js'
import { SIMPLEX4_NORM } from './normalization.js'
import { SIMPLEX4_TSL } from './simplex4.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const SIMPLEX_LOOP_TSL = /* js */ `
const simplexLoop3 = Fn(([p]) => {
  const a = p.z.mul(6.283185307179586).toVar()
  return simplex4(vec4(p.x, p.y, cos(a).mul(0.15915494309189535), sin(a).mul(0.15915494309189535)))
})
`

/** Simplex Loop 3D (Canonical) — TSL shader spec. */
export const simplexLoop3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, SIMPLEX4_TSL, SIMPLEX_LOOP_TSL],
  expr: `simplexLoop3(p).mul(${0.5 * SIMPLEX4_NORM}).add(0.5)`,
}
