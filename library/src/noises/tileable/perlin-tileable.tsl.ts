// TSL counterpart of perlin-tileable.ts. Requires COMMON_TSL and PERLIN_TSL
// (for perlinGrad2 / perlinGrad3).

import { COMMON_TSL } from '../common.tsl.js'
import { PERLIN2_NORM, PERLIN3_NORM } from '../normalization.js'
import { PERLIN_TSL } from '../perlin.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const PERLIN_TILEABLE_TSL = /* js */ `
const perlin2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = uint(imod(int(i.x), px)).mul(LATTICE_HX).toVar()
  const x1 = uint(imod(int(i.x).add(1), px)).mul(LATTICE_HX).toVar()
  const y0 = uint(imod(int(i.y), py)).mul(LATTICE_HY).toVar()
  const y1 = uint(imod(int(i.y).add(1), py)).mul(LATTICE_HY).toVar()
  const g00 = gradTable2(lowbias32(x0.add(y0)), f)
  const g10 = gradTable2(lowbias32(x1.add(y0)), f.sub(vec2(1, 0)))
  const g01 = gradTable2(lowbias32(x0.add(y1)), f.sub(vec2(0, 1)))
  const g11 = gradTable2(lowbias32(x1.add(y1)), f.sub(vec2(1, 1)))
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy)
})

const perlin3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const uz = fade(f.z)
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = uint(imod(int(i.x), px)).mul(LATTICE_HX).toVar()
  const x1 = uint(imod(int(i.x).add(1), px)).mul(LATTICE_HX).toVar()
  const y0 = uint(imod(int(i.y), py)).mul(LATTICE_HY).toVar()
  const y1 = uint(imod(int(i.y).add(1), py)).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const g000 = gradTable3(lowbias32(x0.add(y0).add(z0)), f)
  const g100 = gradTable3(lowbias32(x1.add(y0).add(z0)), f.sub(vec3(1, 0, 0)))
  const g010 = gradTable3(lowbias32(x0.add(y1).add(z0)), f.sub(vec3(0, 1, 0)))
  const g110 = gradTable3(lowbias32(x1.add(y1).add(z0)), f.sub(vec3(1, 1, 0)))
  const g001 = gradTable3(lowbias32(x0.add(y0).add(z1)), f.sub(vec3(0, 0, 1)))
  const g101 = gradTable3(lowbias32(x1.add(y0).add(z1)), f.sub(vec3(1, 0, 1)))
  const g011 = gradTable3(lowbias32(x0.add(y1).add(z1)), f.sub(vec3(0, 1, 1)))
  const g111 = gradTable3(lowbias32(x1.add(y1).add(z1)), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy)
  const nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy)
  return mix(nz0, nz1, uz)
})
`

/** Perlin 2D (Canonical), tileable — TSL shader spec. */
export const perlin2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL],
  expr: `perlin2T(p, per).mul(${0.5 * PERLIN2_NORM}).add(0.5)`,
}

/** Perlin 3D (Canonical), tileable — TSL shader spec. */
export const perlin3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL],
  expr: `perlin3T(p, per).mul(${0.5 * PERLIN3_NORM}).add(0.5)`,
}
