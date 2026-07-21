// GLSL counterpart of white-tileable.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const WHITE_TILEABLE_GLSL = /* glsl */ `
float white2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  int x0 = imod(int(i.x), int(per.x));
  int y0 = imod(int(i.y), int(per.y));
  return to01(hash2u(x0, y0));
}

float white3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  int x0 = imod(int(i.x), int(per.x));
  int y0 = imod(int(i.y), int(per.y));
  return to01(hash3u(x0, y0, int(i.z)));
}
`

/** GLSL spec for White 2D, tileable (shipping implementation). */
export const white2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, WHITE_TILEABLE_GLSL],
  expr: 'white2T(p, per)',
}

/** GLSL spec for White 3D, tileable (shipping implementation). */
export const white3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, WHITE_TILEABLE_GLSL],
  expr: 'white3T(p, per)',
}
