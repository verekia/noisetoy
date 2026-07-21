// GLSL counterpart of ripple-tileable.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'
import { fmt, RIPPLE_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const RIPPLE_TILEABLE_GLSL = /* glsl */ `
float ripple2T(vec2 p, vec2 per) {
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
      vec2 o = vec2(to01(h), to01(h2));
      float ph = to01(lowbias32(h2)) * 6.283185307179586;
      vec2 v = vec2(float(dx), float(dy)) + o - f;
      float d = length(v);
      float w = max(0.0, 1.0 - d / 1.5);
      sum += w * w * cos(d * 15.0 - ph);
    }
  }
  return sum;
}

float ripple3T(vec3 p, vec2 per) {
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
        vec3 o = vec3(to01(h), to01(h2), to01(h3));
        float ph = to01(lowbias32(h3)) * 6.283185307179586;
        vec3 v = vec3(float(dx), float(dy), float(dz)) + o - f;
        float d = length(v);
        float w = max(0.0, 1.0 - d / 1.5);
        sum += w * w * cos(d * 15.0 - ph);
      }
    }
  }
  return sum;
}
`

/** GLSL spec for Ripple 2D, tileable (shipping implementation). */
export const ripple2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, RIPPLE_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(RIPPLE_NORM)} * ripple2T(p, per)`,
}

/** GLSL spec for Ripple 3D, tileable (shipping implementation). */
export const ripple3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, RIPPLE_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(RIPPLE_NORM)} * ripple3T(p, per)`,
}
