// GLSL counterpart of worley.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_GLSL = /* glsl */ `
float worley2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float f1 = 1e9;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      vec2 o = vec2(to01(h), to01(lowbias32(h)));
      vec2 v = vec2(float(dx), float(dy)) + o - f;
      float d = dot(v, v);
      f1 = min(f1, d);
    }
  }
  return sqrt(f1);
}

float worley3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float f1 = 1e9;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        vec3 o = vec3(to01(h), to01(h2), to01(lowbias32(h2)));
        vec3 v = vec3(float(dx), float(dy), float(dz)) + o - f;
        float d = dot(v, v);
        f1 = min(f1, d);
      }
    }
  }
  return sqrt(f1);
}
`

/** GLSL spec for Worley 2D (shipping implementation). */
export const worley2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, WORLEY_GLSL],
  expr: 'worley2(p)',
}

/** GLSL spec for Worley 3D (shipping implementation). */
export const worley3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, WORLEY_GLSL],
  expr: 'worley3(p)',
}
