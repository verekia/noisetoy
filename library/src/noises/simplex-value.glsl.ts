// GLSL counterpart of simplex-value.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'
import { fmt, SIMPLEX_VALUE_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const SIMPLEX_VALUE_GLSL = /* glsl */ `
float contribV2(vec2 d, uint h) {
  float t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * (to01(h) * 2.0 - 1.0);
}

float contribV3(vec3 d, uint h) {
  float t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * (to01(h) * 2.0 - 1.0);
}

float simplexValue2(vec2 p) {
  const float F2 = 0.3660254037844386;
  const float G2 = 0.21132486540518713;
  float s = (p.x + p.y) * F2;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  float t = float(i + j) * G2;
  vec2 d0 = p - (vec2(float(i), float(j)) - t);
  int i1 = d0.x > d0.y ? 1 : 0;
  int j1 = 1 - i1;
  vec2 d1 = d0 - vec2(float(i1), float(j1)) + G2;
  vec2 d2 = d0 - 1.0 + 2.0 * G2;
  return contribV2(d0, hash2u(i, j)) + contribV2(d1, hash2u(i + i1, j + j1)) + contribV2(d2, hash2u(i + 1, j + 1));
}

float simplexValue3(vec3 p) {
  const float F3 = 1.0 / 3.0;
  const float G3 = 1.0 / 6.0;
  float s = (p.x + p.y + p.z) * F3;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  int k = int(floor(p.z + s));
  float t = float(i + j + k) * G3;
  vec3 d0 = p - (vec3(float(i), float(j), float(k)) - t);
  int i1 = 0; int j1 = 0; int k1 = 0;
  int i2 = 0; int j2 = 0; int k2 = 0;
  if (d0.x >= d0.y) {
    if (d0.y >= d0.z) { i1 = 1; i2 = 1; j2 = 1; }
    else if (d0.x >= d0.z) { i1 = 1; i2 = 1; k2 = 1; }
    else { k1 = 1; i2 = 1; k2 = 1; }
  } else {
    if (d0.y < d0.z) { k1 = 1; j2 = 1; k2 = 1; }
    else if (d0.x < d0.z) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
  }
  vec3 d1 = d0 - vec3(float(i1), float(j1), float(k1)) + G3;
  vec3 d2 = d0 - vec3(float(i2), float(j2), float(k2)) + 2.0 * G3;
  vec3 d3 = d0 - 1.0 + 3.0 * G3;
  return contribV3(d0, hash3u(i, j, k)) + contribV3(d1, hash3u(i + i1, j + j1, k + k1)) +
    contribV3(d2, hash3u(i + i2, j + j2, k + k2)) + contribV3(d3, hash3u(i + 1, j + 1, k + 1));
}
`

/** GLSL spec for Simplex Value 2D (shipping implementation). */
export const simplexValue2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, SIMPLEX_VALUE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX_VALUE_NORM)} * simplexValue2(p)`,
}

/** GLSL spec for Simplex Value 3D (shipping implementation). */
export const simplexValue3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, SIMPLEX_VALUE_GLSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX_VALUE_NORM)} * simplexValue3(p)`,
}
