// TSL counterpart of vortex-tileable.ts. Requires COMMON_TSL and VORTEX_TSL
// (reuses vortexCorner2/vortexCorner3).

import { COMMON_TSL } from '../common.tsl.js'
import { VORTEX_TSL } from '../vortex.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const VORTEX_TILEABLE_TSL = /* js */ `
const vortex2T = Fn(([p, per]) => {
  const i = floor(p)
  const ux = fade(p.x.sub(i.x))
  const uy = fade(p.y.sub(i.y))
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = imod(int(i.x), px).toVar()
  const x1 = imod(int(i.x).add(1), px).toVar()
  const y0 = imod(int(i.y), py).toVar()
  const y1 = imod(int(i.y).add(1), py).toVar()
  const s = vec2(0).toVar()
  s.addAssign(vortexCorner2(hash2u(x0, y0), ux.oneMinus().mul(uy.oneMinus())))
  s.addAssign(vortexCorner2(hash2u(x1, y0), ux.mul(uy.oneMinus())))
  s.addAssign(vortexCorner2(hash2u(x0, y1), ux.oneMinus().mul(uy)))
  s.addAssign(vortexCorner2(hash2u(x1, y1), ux.mul(uy)))
  return cos(atan(s.y, s.x).mul(2))
})

const vortex3T = Fn(([p, per]) => {
  const i = floor(p)
  const ux = fade(p.x.sub(i.x))
  const uy = fade(p.y.sub(i.y))
  const uz = fade(p.z.sub(i.z))
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = imod(int(i.x), px).toVar()
  const x1 = imod(int(i.x).add(1), px).toVar()
  const y0 = imod(int(i.y), py).toVar()
  const y1 = imod(int(i.y).add(1), py).toVar()
  const iz = int(i.z).toVar()
  const s = vec2(0).toVar()
  s.addAssign(vortexCorner3(hash3u(x0, y0, iz), ux.oneMinus().mul(uy.oneMinus()).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(x1, y0, iz), ux.mul(uy.oneMinus()).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(x0, y1, iz), ux.oneMinus().mul(uy).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(x1, y1, iz), ux.mul(uy).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(x0, y0, iz.add(1)), ux.oneMinus().mul(uy.oneMinus()).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(x1, y0, iz.add(1)), ux.mul(uy.oneMinus()).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(x0, y1, iz.add(1)), ux.oneMinus().mul(uy).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(x1, y1, iz.add(1)), ux.mul(uy).mul(uz)))
  return cos(atan(s.y, s.x).mul(2))
})
`

/** Vortex 2D (Canonical), tileable — TSL shader spec. */
export const vortex2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, VORTEX_TSL, VORTEX_TILEABLE_TSL],
  expr: 'vortex2T(p, per).mul(0.5).add(0.5)',
}

/** Vortex 3D (Canonical), tileable — TSL shader spec. */
export const vortex3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, VORTEX_TSL, VORTEX_TILEABLE_TSL],
  expr: 'vortex3T(p, per).mul(0.5).add(0.5)',
}
