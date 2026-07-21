// GLSL counterpart of vortex-tileable.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const VORTEX_TILEABLE_GLSL = /* glsl */ `
float vortex2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  vec2 s = vec2(0.0);
  for (int cy = 0; cy <= 1; cy++) {
    for (int cx = 0; cx <= 1; cx++) {
      float a = to01(hash2u(imod(ix + cx, px), imod(iy + cy, py))) * 6.283185307179586;
      float w = (cx == 0 ? 1.0 - ux : ux) * (cy == 0 ? 1.0 - uy : uy);
      s += w * vec2(cos(a), sin(a));
    }
  }
  return cos(2.0 * atan(s.y, s.x));
}

float vortex3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  vec2 s = vec2(0.0);
  for (int cz = 0; cz <= 1; cz++) {
    for (int cy = 0; cy <= 1; cy++) {
      for (int cx = 0; cx <= 1; cx++) {
        uint h = hash3u(imod(ix + cx, px), imod(iy + cy, py), iz + cz);
        float kz = to01(h) * 2.0 - 1.0;
        float a = to01(lowbias32(h)) * 6.283185307179586;
        float r = sqrt(max(0.0, 1.0 - kz * kz));
        float w = (cx == 0 ? 1.0 - ux : ux) * (cy == 0 ? 1.0 - uy : uy) * (cz == 0 ? 1.0 - uz : uz);
        s += w * r * vec2(cos(a), sin(a));
      }
    }
  }
  return cos(2.0 * atan(s.y, s.x));
}
`

/** GLSL spec for Vortex 2D, tileable (shipping implementation). */
export const vortex2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, VORTEX_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * vortex2T(p, per)',
}

/** GLSL spec for Vortex 3D, tileable (shipping implementation). */
export const vortex3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, VORTEX_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * vortex3T(p, per)',
}
