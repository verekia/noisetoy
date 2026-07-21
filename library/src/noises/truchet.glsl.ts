// GLSL counterpart of truchet.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const TRUCHET_GLSL = /* glsl */ `
float truchet2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  if ((hash2u(int(i.x), int(i.y)) & 1u) == 1u) { f.x = 1.0 - f.x; }
  float d1 = abs(length(f) - 0.5);
  float d2 = abs(length(f - 1.0) - 0.5);
  float d = min(d1, d2);
  return cos(d * 6.283185307179586 * 3.0);
}
`

/** GLSL spec for Truchet 2D (shipping implementation). */
export const truchet2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, TRUCHET_GLSL],
  expr: '0.5 + 0.5 * truchet2(p)',
}
