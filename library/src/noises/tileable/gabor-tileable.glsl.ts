// GLSL counterpart of gabor-tileable.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'
import { fmt, GABOR2_NORM, GABOR3_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const GABOR_TILEABLE_GLSL = /* glsl */ `
float gabor2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float sum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      uint h2 = lowbias32(h);
      uint h3 = lowbias32(h2);
      uint h4 = lowbias32(h3);
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(h2)) - f;
      float ph = to01(h3) * 6.283185307179586;
      float w = to01(h4) * 2.0 - 1.0;
      float proj = gradDot2(lowbias32(h4), v);
      sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
    }
  }
  return sum;
}

float gabor3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float sum = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        uint h2 = lowbias32(h);
        uint h3 = lowbias32(h2);
        uint h4 = lowbias32(h3);
        uint h5 = lowbias32(h4);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(h3)) - f;
        float ph = to01(h4) * 6.283185307179586;
        float w = to01(h5) * 2.0 - 1.0;
        float proj = gradDot3(lowbias32(h5), v);
        sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
      }
    }
  }
  return sum;
}
`

/** GLSL spec for Gabor 2D, tileable (shipping implementation). */
export const gabor2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, GABOR_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR2_NORM)} * gabor2T(p, per)`,
}

/** GLSL spec for Gabor 3D, tileable (shipping implementation). */
export const gabor3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, GABOR_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR3_NORM)} * gabor3T(p, per)`,
}
