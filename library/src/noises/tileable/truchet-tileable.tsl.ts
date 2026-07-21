// TSL counterpart of truchet-tileable.ts. Requires COMMON_TSL.

import { COMMON_TSL } from '../common.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const TRUCHET_TILEABLE_TSL = /* js */ `
const truchet2T = Fn(([p, per]) => {
  const i = floor(p)
  const fy = p.y.sub(i.y)
  const fx = p.x.sub(i.x).toVar()
  If(hash2u(imod(int(i.x), int(per.x)), imod(int(i.y), int(per.y))).bitAnd(uint(1)).equal(uint(1)), () => {
    fx.assign(fx.oneMinus())
  })
  const d1 = sqrt(fx.mul(fx).add(fy.mul(fy))).sub(0.5).abs()
  const gx = fx.sub(1)
  const gy = fy.sub(1)
  const d2 = sqrt(gx.mul(gx).add(gy.mul(gy))).sub(0.5).abs()
  return cos(d1.min(d2).mul(6.283185307179586 * 3))
})
`

/** Truchet 2D (Canonical), tileable — TSL shader spec. */
export const truchet2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, TRUCHET_TILEABLE_TSL],
  expr: 'truchet2T(p, per).mul(0.5).add(0.5)',
}
