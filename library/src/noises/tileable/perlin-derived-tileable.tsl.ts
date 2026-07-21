// TSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_TSL and PERLIN_TILEABLE_TSL.

import { COMMON_TSL } from '../common.tsl.js'
import { PERLIN_TSL } from '../perlin.tsl.js'
import { PERLIN_TILEABLE_TSL } from './perlin-tileable.tsl.js'

import type { ShaderSpec } from '../../spec.js'

export const PERLIN_DERIVED_TILEABLE_TSL = /* js */ `
const turb2T = Fn(([p, per]) =>
  abs(perlin2T(p, per))
    .add(abs(perlin2T(p.mul(2), per.mul(2))).mul(0.5))
    .add(abs(perlin2T(p.mul(4), per.mul(4))).mul(0.25)),
)

const turb3T = Fn(([p, per]) =>
  abs(perlin3T(p, per))
    .add(abs(perlin3T(p.mul(2), per.mul(2))).mul(0.5))
    .add(abs(perlin3T(p.mul(4), per.mul(4))).mul(0.25)),
)

const marble2T = Fn(([p, per]) => cos(p.x.add(turb2T(p, per).mul(1.5)).mul(3.141592653589793)))

const marble3T = Fn(([p, per]) => cos(p.x.add(turb3T(p, per).mul(1.5)).mul(3.141592653589793)))

const contour2T = Fn(([p, per]) => cos(perlin2T(p, per).mul(12)))

const contour3T = Fn(([p, per]) => cos(perlin3T(p, per).mul(12)))
`

/** Marble 2D (Canonical), tileable — TSL shader spec. */
export const marble2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
  expr: 'marble2T(p, per).mul(0.5).add(0.5)',
}

/** Marble 3D (Canonical), tileable — TSL shader spec. */
export const marble3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
  expr: 'marble3T(p, per).mul(0.5).add(0.5)',
}

/** Contour 2D (Canonical), tileable — TSL shader spec. */
export const contour2dCanonicalTileableTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
  expr: 'contour2T(p, per).mul(0.5).add(0.5)',
}

/** Contour 3D (Canonical), tileable — TSL shader spec. */
export const contour3dCanonicalTileableTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_TILEABLE_TSL, PERLIN_DERIVED_TILEABLE_TSL],
  expr: 'contour3T(p, per).mul(0.5).add(0.5)',
}
