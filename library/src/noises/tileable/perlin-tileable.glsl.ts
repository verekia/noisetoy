// GLSL counterpart of perlin-tileable.ts. Requires COMMON_GLSL and PERLIN_GLSL
// (for perlinGrad2 / perlinGrad3).

import { COMMON_GLSL } from '../common.glsl.js'
import { fmt, PERLIN2_NORM, PERLIN3_NORM } from '../normalization.js'
import { PERLIN_GLSL } from '../perlin.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const PERLIN_TILEABLE_GLSL = /* glsl */ `
float perlin2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  int px = int(per.x);
  int py = int(per.y);
  uint x0 = uint(imod(int(i.x), px)) * LATTICE_HX;
  uint x1 = uint(imod(int(i.x) + 1, px)) * LATTICE_HX;
  uint y0 = uint(imod(int(i.y), py)) * LATTICE_HY;
  uint y1 = uint(imod(int(i.y) + 1, py)) * LATTICE_HY;
  float g00 = gradTable2(lowbias32(x0 + y0), f);
  float g10 = gradTable2(lowbias32(x1 + y0), f - vec2(1.0, 0.0));
  float g01 = gradTable2(lowbias32(x0 + y1), f - vec2(0.0, 1.0));
  float g11 = gradTable2(lowbias32(x1 + y1), f - vec2(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}

float perlin3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  int px = int(per.x);
  int py = int(per.y);
  uint x0 = uint(imod(int(i.x), px)) * LATTICE_HX;
  uint x1 = uint(imod(int(i.x) + 1, px)) * LATTICE_HX;
  uint y0 = uint(imod(int(i.y), py)) * LATTICE_HY;
  uint y1 = uint(imod(int(i.y) + 1, py)) * LATTICE_HY;
  uint z0 = uint(int(i.z)) * LATTICE_HZ;
  uint z1 = z0 + LATTICE_HZ;
  float g000 = gradTable3(lowbias32(x0 + y0 + z0), f);
  float g100 = gradTable3(lowbias32(x1 + y0 + z0), f - vec3(1.0, 0.0, 0.0));
  float g010 = gradTable3(lowbias32(x0 + y1 + z0), f - vec3(0.0, 1.0, 0.0));
  float g110 = gradTable3(lowbias32(x1 + y1 + z0), f - vec3(1.0, 1.0, 0.0));
  float g001 = gradTable3(lowbias32(x0 + y0 + z1), f - vec3(0.0, 0.0, 1.0));
  float g101 = gradTable3(lowbias32(x1 + y0 + z1), f - vec3(1.0, 0.0, 1.0));
  float g011 = gradTable3(lowbias32(x0 + y1 + z1), f - vec3(0.0, 1.0, 1.0));
  float g111 = gradTable3(lowbias32(x1 + y1 + z1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  float nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** GLSL spec for Perlin 2D, tileable (shipping implementation). */
export const perlin2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * perlin2T(p, per)`,
}

/** GLSL spec for Perlin 3D, tileable (shipping implementation). */
export const perlin3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, PERLIN_GLSL, PERLIN_TILEABLE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN3_NORM)} * perlin3T(p, per)`,
}
