// GLSL counterpart of cellular-tileable.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from '../common.glsl.js'
import { CRACKLE_NORM, fmt, STARS_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const CELLULAR_TILEABLE_GLSL = /* glsl */ `
float mosaic2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float best = 1e9;
  uint bh = 0u;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float d2 = dot(v, v);
      if (d2 < best) { best = d2; bh = h; }
    }
  }
  return to01(lowbias32(lowbias32(bh)));
}

float mosaic3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float best = 1e9;
  uint bh = 0u;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        uint h2 = lowbias32(h);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        float d2 = dot(v, v);
        if (d2 < best) { best = d2; bh = h; }
      }
    }
  }
  return to01(lowbias32(lowbias32(lowbias32(bh))));
}

float crackle2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  float f2 = 1e9;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float d2 = dot(v, v);
      if (d2 < f1) { f2 = f1; f1 = d2; }
      else if (d2 < f2) { f2 = d2; }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

float crackle3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  float f2 = 1e9;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
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

float foam2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float m = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(lowbias32(h))) - f;
      float t = 1.21 - dot(v, v);
      if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
    }
  }
  return m;
}

float foam3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float m = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        uint h2 = lowbias32(h);
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        float t = 1.21 - dot(v, v);
        if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
      }
    }
  }
  return m;
}

float stars2T(vec2 p, vec2 per) {
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
      vec2 v = vec2(float(dx), float(dy)) + vec2(to01(h), to01(h2)) - f;
      sum += to01(lowbias32(h2)) * exp(-dot(v, v) * 18.0);
    }
  }
  return sum;
}

float stars3T(vec3 p, vec2 per) {
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
        vec3 v = vec3(float(dx), float(dy), float(dz)) + vec3(to01(h), to01(h2), to01(h3)) - f;
        sum += to01(lowbias32(h3)) * exp(-dot(v, v) * 18.0);
      }
    }
  }
  return sum;
}
`

/** GLSL spec for Mosaic 2D, tileable (shipping implementation). */
export const mosaic2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: 'mosaic2T(p, per)',
}

/** GLSL spec for Mosaic 3D, tileable (shipping implementation). */
export const mosaic3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: 'mosaic3T(p, per)',
}

/** GLSL spec for Crackle 2D, tileable (shipping implementation). */
export const crackle2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle2T(p, per)`,
}

/** GLSL spec for Crackle 3D, tileable (shipping implementation). */
export const crackle3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle3T(p, per)`,
}

/** GLSL spec for Foam 2D, tileable (shipping implementation). */
export const foam2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: 'foam2T(p, per)',
}

/** GLSL spec for Foam 3D, tileable (shipping implementation). */
export const foam3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: 'foam3T(p, per)',
}

/** GLSL spec for Stars 2D, tileable (shipping implementation). */
export const stars2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: `${fmt(STARS_NORM)} * stars2T(p, per)`,
}

/** GLSL spec for Stars 3D, tileable (shipping implementation). */
export const stars3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, CELLULAR_TILEABLE_GLSL],
  expr: `${fmt(STARS_NORM)} * stars3T(p, per)`,
}
