// TSL counterpart of perlin-derived.ts (Marble, Contour).
// Requires COMMON_TSL and PERLIN_TSL.

import { COMMON_TSL } from './common.tsl.js'
import { PERLIN_TSL } from './perlin.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_DERIVED_TSL = /* js */ `
const turb2 = Fn(([p]) =>
  abs(perlin2(p)).add(abs(perlin2(p.mul(2))).mul(0.5)).add(abs(perlin2(p.mul(4))).mul(0.25)),
)

const turb3 = Fn(([p]) =>
  abs(perlin3(p)).add(abs(perlin3(p.mul(2))).mul(0.5)).add(abs(perlin3(p.mul(4))).mul(0.25)),
)

const marble2 = Fn(([p]) => cos(p.x.add(turb2(p).mul(1.5)).mul(3.141592653589793)))

const marble3 = Fn(([p]) => cos(p.x.add(turb3(p).mul(1.5)).mul(3.141592653589793)))

const contour2 = Fn(([p]) => cos(perlin2(p).mul(12)))

const contour3 = Fn(([p]) => cos(perlin3(p).mul(12)))
`

/** Marble 2D (Canonical) — TSL shader spec. */
export const marble2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_DERIVED_TSL],
  expr: 'marble2(p).mul(0.5).add(0.5)',
}

/** Marble 3D (Canonical) — TSL shader spec. */
export const marble3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_DERIVED_TSL],
  expr: 'marble3(p).mul(0.5).add(0.5)',
}

/** Contour 2D (Canonical) — TSL shader spec. */
export const contour2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_DERIVED_TSL],
  expr: 'contour2(p).mul(0.5).add(0.5)',
}

/** Contour 3D (Canonical) — TSL shader spec. */
export const contour3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, PERLIN_TSL, PERLIN_DERIVED_TSL],
  expr: 'contour3(p).mul(0.5).add(0.5)',
}
