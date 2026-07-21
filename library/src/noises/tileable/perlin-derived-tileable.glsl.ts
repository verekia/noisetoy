// GLSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_GLSL and PERLIN_TILEABLE_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'
import { PERLIN_GLSL } from '../perlin.glsl.js'
import { PERLIN_TILEABLE_GLSL } from './perlin-tileable.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const PERLIN_DERIVED_TILEABLE_GLSL = /* glsl */ `
float turb2T(vec2 p, vec2 per) {
  return abs(perlin2T(p, per)) + 0.5 * abs(perlin2T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin2T(p * 4.0, per * 4.0));
}

float turb3T(vec3 p, vec2 per) {
  return abs(perlin3T(p, per)) + 0.5 * abs(perlin3T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin3T(p * 4.0, per * 4.0));
}

float marble2T(vec2 p, vec2 per) { return cos((p.x + 1.5 * turb2T(p, per)) * 3.141592653589793); }

float marble3T(vec3 p, vec2 per) { return cos((p.x + 1.5 * turb3T(p, per)) * 3.141592653589793); }

float contour2T(vec2 p, vec2 per) { return cos(perlin2T(p, per) * 12.0); }

float contour3T(vec3 p, vec2 per) { return cos(perlin3T(p, per) * 12.0); }
`

/** GLSL spec for Marble 2D, tileable (shipping implementation). */
export const marble2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * marble2T(p, per)',
}

/** GLSL spec for Marble 3D, tileable (shipping implementation). */
export const marble3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * marble3T(p, per)',
}

/** GLSL spec for Contour 2D, tileable (shipping implementation). */
export const contour2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * contour2T(p, per)',
}

/** GLSL spec for Contour 3D, tileable (shipping implementation). */
export const contour3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * contour3T(p, per)',
}
