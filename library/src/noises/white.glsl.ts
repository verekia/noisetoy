// GLSL counterpart of white.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const WHITE_GLSL = /* glsl */ `
float white2(vec2 p) {
  vec2 i = floor(p);
  return to01(hash2u(int(i.x), int(i.y)));
}

float white3(vec3 p) {
  vec3 i = floor(p);
  return to01(hash3u(int(i.x), int(i.y), int(i.z)));
}
`

/** GLSL spec for White 2D (shipping implementation). */
export const white2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, WHITE_GLSL],
  expr: 'white2(p)',
}

/** GLSL spec for White 3D (shipping implementation). */
export const white3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, WHITE_GLSL],
  expr: 'white3(p)',
}
