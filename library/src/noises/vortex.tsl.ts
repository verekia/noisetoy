// TSL counterpart of vortex.ts (corners unrolled). Requires COMMON_TSL.

import { COMMON_TSL } from './common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const VORTEX_TSL = /* js */ `
const vortexCorner2 = Fn(([h, w]) => {
  const a = to01(h).mul(6.283185307179586)
  return vec2(cos(a), sin(a)).mul(w)
})

const vortexCorner3 = Fn(([h, w]) => {
  const kz = to01(h).mul(2).sub(1)
  const a = to01(lowbias32(h)).mul(6.283185307179586)
  const r = kz.mul(kz).oneMinus().max(0).sqrt()
  return vec2(r.mul(cos(a)), r.mul(sin(a))).mul(w)
})

const vortex2 = Fn(([p]) => {
  const i = floor(p)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const ux = fade(p.x.sub(i.x))
  const uy = fade(p.y.sub(i.y))
  const s = vec2(0).toVar()
  s.addAssign(vortexCorner2(hash2u(ix, iy), ux.oneMinus().mul(uy.oneMinus())))
  s.addAssign(vortexCorner2(hash2u(ix.add(1), iy), ux.mul(uy.oneMinus())))
  s.addAssign(vortexCorner2(hash2u(ix, iy.add(1)), ux.oneMinus().mul(uy)))
  s.addAssign(vortexCorner2(hash2u(ix.add(1), iy.add(1)), ux.mul(uy)))
  return cos(atan(s.y, s.x).mul(2))
})

const vortex3 = Fn(([p]) => {
  const i = floor(p)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const ux = fade(p.x.sub(i.x))
  const uy = fade(p.y.sub(i.y))
  const uz = fade(p.z.sub(i.z))
  const s = vec2(0).toVar()
  s.addAssign(vortexCorner3(hash3u(ix, iy, iz), ux.oneMinus().mul(uy.oneMinus()).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(ix.add(1), iy, iz), ux.mul(uy.oneMinus()).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(ix, iy.add(1), iz), ux.oneMinus().mul(uy).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(ix.add(1), iy.add(1), iz), ux.mul(uy).mul(uz.oneMinus())))
  s.addAssign(vortexCorner3(hash3u(ix, iy, iz.add(1)), ux.oneMinus().mul(uy.oneMinus()).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(ix.add(1), iy, iz.add(1)), ux.mul(uy.oneMinus()).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(ix, iy.add(1), iz.add(1)), ux.oneMinus().mul(uy).mul(uz)))
  s.addAssign(vortexCorner3(hash3u(ix.add(1), iy.add(1), iz.add(1)), ux.mul(uy).mul(uz)))
  return cos(atan(s.y, s.x).mul(2))
})
`

/** Vortex 2D (Canonical) — TSL shader spec. */
export const vortex2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, VORTEX_TSL],
  expr: 'vortex2(p).mul(0.5).add(0.5)',
}

/** Vortex 3D (Canonical) — TSL shader spec. */
export const vortex3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, VORTEX_TSL],
  expr: 'vortex3(p).mul(0.5).add(0.5)',
}
