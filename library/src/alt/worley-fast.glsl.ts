// GLSL counterpart of worley-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL.
//
// The pruning branches are ported faithfully. On a GPU they cost divergence
// instead of saving work when neighbouring fragments disagree, which is
// exactly the trade the TS header flags as needing its own measurement —
// this chunk is what makes that measurement possible.

import { COMMON_GLSL } from '../noises/common.glsl.js'
import { FAST_COMMON_GLSL } from './fast-common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_FAST_GLSL = /* glsl */ `
float worleyFastCell2(uint s, vec2 b, float f1) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  vec2 v = b + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
  return min(f1, dot(v, v));
}

float worleyFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = worleyFastCell2(xc + yc, vec2(-f.x, -f.y), 1e9);
  f1 = worleyFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), f1);
  f1 = worleyFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), f1);
  if (f.x * f.x < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = worleyFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), f1);
    f1 = worleyFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = worleyFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), f1);
  }
  float gx = 1.0 - f.x;
  if (gx * gx < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = worleyFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), f1);
    f1 = worleyFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), f1);
    f1 = worleyFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), f1);
  }
  return sqrt(f1);
}

float worleyFastCell3(uint s, vec3 b, float f1) {
  uint h = lowbias32(s);
  vec3 o = vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  vec3 v = b + o;
  return min(f1, dot(v, v));
}

float worleyFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zz, float f1in) {
  float f1 = f1in;
  vec3 bc = vec3(-fxy.x, -fxy.y, bz);
  f1 = worleyFastCell3(xc + ycz, bc, f1);
  f1 = worleyFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = worleyFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (fxy.x * fxy.x + zz < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = worleyFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = worleyFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = worleyFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  float gx = 1.0 - fxy.x;
  if (gx * gx + zz < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = worleyFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = worleyFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = worleyFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

float worleyFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = worleyFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  float zzm = f.z * f.z;
  if (zzm < f1) {
    uint zm = zc - LATTICE_HZ;
    f1 = worleyFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, f1);
  }
  float gz = 1.0 - f.z;
  float zzp = gz * gz;
  if (zzp < f1) {
    uint zp = zc + LATTICE_HZ;
    f1 = worleyFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, f1);
  }
  return sqrt(f1);
}
`

/** Worley 2D, 'split-bits-pruned' fast implementation — GLSL spec. */
export const worley2dFastGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, WORLEY_FAST_GLSL],
  expr: 'worleyFast2(p)',
}

/** Worley 3D, 'split-bits-pruned' fast implementation — GLSL spec. */
export const worley3dFastGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, WORLEY_FAST_GLSL],
  expr: 'worleyFast3(p)',
}
