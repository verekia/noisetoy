// GLSL counterpart of perlin-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. Function names carry the Fast suffix so a stack can
// compose this next to the shipping perlin chunk without collisions.

import { COMMON_GLSL } from '../noises/common.glsl.js'
import { fmt, PERLIN2_NORM, PERLIN3_NORM } from '../noises/normalization.js'
import { FAST_COMMON_GLSL } from './fast-common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_FAST_GLSL = /* glsl */ `
float perlinFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float s = f.x + f.y;
  float d = f.x - f.y;
  float s1 = s - 1.0;
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  uint rx0 = x0 ^ (x0 >> 16u);
  uint rx1 = x1 ^ (x1 >> 16u);
  float g00 = pickSD((rx0 ^ y0) * ALT_FIB, s, d);
  float g10 = pickSD((rx1 ^ y0) * ALT_FIB, s1, d - 1.0);
  float g01 = pickSD((rx0 ^ y1) * ALT_FIB, s1, d + 1.0);
  float g11 = pickSD((rx1 ^ y1) * ALT_FIB, s - 2.0, d);
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}

float perlinFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint z0 = uint(int(i.z)) * LATTICE_HZ;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  uint z1 = z0 + LATTICE_HZ;
  uint xy00 = x0 + y0;
  uint xy10 = x1 + y0;
  uint xy01 = x0 + y1;
  uint xy11 = x1 + y1;
  float g000 = gradFast3(lmfMix(xy00 + z0), f);
  float g100 = gradFast3(lmfMix(xy10 + z0), f - vec3(1.0, 0.0, 0.0));
  float g010 = gradFast3(lmfMix(xy01 + z0), f - vec3(0.0, 1.0, 0.0));
  float g110 = gradFast3(lmfMix(xy11 + z0), f - vec3(1.0, 1.0, 0.0));
  float g001 = gradFast3(lmfMix(xy00 + z1), f - vec3(0.0, 0.0, 1.0));
  float g101 = gradFast3(lmfMix(xy10 + z1), f - vec3(1.0, 0.0, 1.0));
  float g011 = gradFast3(lmfMix(xy01 + z1), f - vec3(0.0, 1.0, 1.0));
  float g111 = gradFast3(lmfMix(xy11 + z1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  float nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Perlin 2D, 'fib-hash' fast implementation — GLSL spec. */
export const perlin2dFastGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, PERLIN_FAST_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * perlinFast2(p)`,
}

/** Perlin 3D, 'fib-hash' fast implementation — GLSL spec. */
export const perlin3dFastGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, PERLIN_FAST_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN3_NORM)} * perlinFast3(p)`,
}
