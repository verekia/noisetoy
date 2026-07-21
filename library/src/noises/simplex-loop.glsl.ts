// GLSL counterpart of simplex-loop.ts. Requires COMMON_GLSL and SIMPLEX4_GLSL.

import { COMMON_GLSL } from './common.glsl.js'
import { fmt, SIMPLEX4_NORM } from './normalization.js'
import { SIMPLEX4_GLSL } from './simplex4.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const SIMPLEX_LOOP_GLSL = /* glsl */ `
float simplexLoop3(vec3 p) {
  float a = p.z * 6.283185307179586;
  return simplex4(vec4(p.x, p.y, 0.15915494309189535 * cos(a), 0.15915494309189535 * sin(a)));
}
`

/** GLSL spec for Simplex Loop 3D (shipping implementation). */
export const simplexLoop3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, SIMPLEX4_GLSL, SIMPLEX_LOOP_GLSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX4_NORM)} * simplexLoop3(p)`,
}
