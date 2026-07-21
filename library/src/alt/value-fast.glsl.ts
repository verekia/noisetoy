// GLSL counterpart of value-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL.

import { COMMON_GLSL } from '../noises/common.glsl.js'
import { FAST_COMMON_GLSL } from './fast-common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const VALUE_FAST_GLSL = /* glsl */ `
float valFastCorner2(uint s) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  return float(h >> 16u) * (1.0 / 65536.0);
}

float valFastCorner3(uint s) {
  return float(lowbias32(s) >> 8u) * (1.0 / 16777216.0);
}

float valueFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  float n00 = valFastCorner2(x0 + y0);
  float n10 = valFastCorner2(x1 + y0);
  float n01 = valFastCorner2(x0 + y1);
  float n11 = valFastCorner2(x1 + y1);
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

float valueFast3(vec3 p) {
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
  float n000 = valFastCorner3(x0 + y0 + z0);
  float n100 = valFastCorner3(x1 + y0 + z0);
  float n010 = valFastCorner3(x0 + y1 + z0);
  float n110 = valFastCorner3(x1 + y1 + z0);
  float n001 = valFastCorner3(x0 + y0 + z1);
  float n101 = valFastCorner3(x1 + y0 + z1);
  float n011 = valFastCorner3(x0 + y1 + z1);
  float n111 = valFastCorner3(x1 + y1 + z1);
  float nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  float nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Value 2D, 'fib-hash' fast implementation — GLSL spec. */
export const value2dFastGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, VALUE_FAST_GLSL],
  expr: 'valueFast2(p)',
}

/** Value 3D, 'fib-hash' fast implementation — GLSL spec. */
export const value3dFastGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, VALUE_FAST_GLSL],
  expr: 'valueFast3(p)',
}
