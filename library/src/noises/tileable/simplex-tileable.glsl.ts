// GLSL counterpart of simplex-tileable.ts. Requires COMMON_GLSL and SIMPLEX4_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'
import { fmt, SIMPLEX4_NORM } from '../normalization.js'
import { SIMPLEX4_GLSL } from '../simplex4.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const SIMPLEX_TILEABLE_GLSL = /* glsl */ `
float simplex2T(vec2 p, vec2 per) {
  const float TAU = 6.283185307179586;
  vec2 a = p / per * TAU;
  vec2 r = per / TAU;
  return simplex4(vec4(r.x * cos(a.x), r.x * sin(a.x), r.y * cos(a.y), r.y * sin(a.y)));
}
`

/** GLSL spec for Simplex 2D, tileable (shipping implementation). */
export const simplex2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, SIMPLEX4_GLSL, SIMPLEX_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX4_NORM)} * simplex2T(p, per)`,
}
