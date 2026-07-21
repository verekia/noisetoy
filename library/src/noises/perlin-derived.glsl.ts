// GLSL counterpart of perlin-derived.ts. Requires COMMON_GLSL and PERLIN_GLSL.

import { COMMON_GLSL } from './common.glsl.js'
import { PERLIN_GLSL } from './perlin.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_DERIVED_GLSL = /* glsl */ `
float turb2(vec2 p) { return abs(perlin2(p)) + 0.5 * abs(perlin2(p * 2.0)) + 0.25 * abs(perlin2(p * 4.0)); }

float turb3(vec3 p) { return abs(perlin3(p)) + 0.5 * abs(perlin3(p * 2.0)) + 0.25 * abs(perlin3(p * 4.0)); }

float marble2(vec2 p) { return cos((p.x + 1.5 * turb2(p)) * 3.141592653589793); }

float marble3(vec3 p) { return cos((p.x + 1.5 * turb3(p)) * 3.141592653589793); }

float contour2(vec2 p) { return cos(perlin2(p) * 12.0); }

float contour3(vec3 p) { return cos(perlin3(p) * 12.0); }
`

/** GLSL spec for Marble 2D (shipping implementation). */
export const marble2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_DERIVED_GLSL],
  expr: '0.5 + 0.5 * marble2(p)',
}

/** GLSL spec for Marble 3D (shipping implementation). */
export const marble3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_DERIVED_GLSL],
  expr: '0.5 + 0.5 * marble3(p)',
}

/** GLSL spec for Contour 2D (shipping implementation). */
export const contour2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_DERIVED_GLSL],
  expr: '0.5 + 0.5 * contour2(p)',
}

/** GLSL spec for Contour 3D (shipping implementation). */
export const contour3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_DERIVED_GLSL],
  expr: '0.5 + 0.5 * contour3(p)',
}
