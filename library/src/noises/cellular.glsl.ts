// GLSL counterpart of cellular.ts. Requires COMMON_GLSL.
// GLSL has no structs-by-convention here: each noise carries its own loop so
// every function stays self-contained for shader composition.

import { COMMON_GLSL } from './common.glsl.js'
import { CRACKLE_NORM, fmt, STARS_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const CELLULAR_GLSL = /* glsl */ `
float mosaic2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float best = 1e9;
  uint bh = 0u;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float d2 = dot(v, v);
      if (d2 < best) { best = d2; bh = h; }
    }
  }
  return to01(lowbias32(lowbias32(bh)));
}

float mosaic3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float best = 1e9;
  uint bh = 0u;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        float d2 = dot(v, v);
        if (d2 < best) { best = d2; bh = h; }
      }
    }
  }
  return to01(lowbias32(lowbias32(lowbias32(bh))));
}

float crackle2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float f1 = 1e9;
  float f2 = 1e9;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float d2 = dot(v, v);
      if (d2 < f1) { f2 = f1; f1 = d2; }
      else if (d2 < f2) { f2 = d2; }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

float crackle3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float f1 = 1e9;
  float f2 = 1e9;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        float d2 = dot(v, v);
        if (d2 < f1) { f2 = f1; f1 = d2; }
        else if (d2 < f2) { f2 = d2; }
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

float foam2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float m = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float t = 1.21 - dot(v, v);
      if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
    }
  }
  return m;
}

float foam3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float m = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        float t = 1.21 - dot(v, v);
        if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
      }
    }
  }
  return m;
}

float stars2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float sum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      uint h2 = lowbias32(h);
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(h2)) - f;
      sum += to01(lowbias32(h2)) * exp(-dot(v, v) * 18.0);
    }
  }
  return sum;
}

float stars3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float sum = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        uint h3 = lowbias32(h2);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(h3)) - f;
        sum += to01(lowbias32(h3)) * exp(-dot(v, v) * 18.0);
      }
    }
  }
  return sum;
}
`

/** GLSL spec for Mosaic 2D (shipping implementation). */
export const mosaic2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: 'mosaic2(p)',
}

/** GLSL spec for Mosaic 3D (shipping implementation). */
export const mosaic3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: 'mosaic3(p)',
}

/** GLSL spec for Crackle 2D (shipping implementation). */
export const crackle2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle2(p)`,
}

/** GLSL spec for Crackle 3D (shipping implementation). */
export const crackle3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle3(p)`,
}

/** GLSL spec for Foam 2D (shipping implementation). */
export const foam2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: 'foam2(p)',
}

/** GLSL spec for Foam 3D (shipping implementation). */
export const foam3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: 'foam3(p)',
}

/** GLSL spec for Stars 2D (shipping implementation). */
export const stars2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: `${fmt(STARS_NORM)} * stars2(p)`,
}

/** GLSL spec for Stars 3D (shipping implementation). */
export const stars3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_GLSL],
  expr: `${fmt(STARS_NORM)} * stars3(p)`,
}
