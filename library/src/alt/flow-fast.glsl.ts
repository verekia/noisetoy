// GLSL counterpart of flow-fast.ts. Requires COMMON_GLSL and FAST_COMMON_GLSL.
// A corner helper is fine here — shader compilers inline unconditionally, so
// the JIT fragility that forced the TS version longhand does not apply.

import { COMMON_GLSL } from '../noises/common.glsl.js'
import { fmt, PERLIN2_NORM } from '../noises/normalization.js'
import { FAST_COMMON_GLSL } from './fast-common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const FLOW_FAST_GLSL = /* glsl */ `
float flowFastCorner(uint h, vec2 d, float c1, float s1, float c2, float s2) {
  uint dir = h >> 29u;
  float S8 = 0.7071067811865476;
  float gx = dir == 0u ? 1.0 : dir == 4u ? -1.0 : (dir & 1u) == 0u ? 0.0 : (dir == 1u || dir == 7u) ? S8 : -S8;
  float gy = dir == 2u ? 1.0 : dir == 6u ? -1.0 : (dir & 1u) == 0u ? 0.0 : (dir == 1u || dir == 3u) ? S8 : -S8;
  float p = gx * d.x + gy * d.y;
  float q = gx * d.y - gy * d.x;
  float ck = (h & 0x10000000u) == 0u ? c1 : c2;
  float sk = (h & 0x10000000u) == 0u ? s1 : s2;
  return ck * p + ((h & 0x08000000u) == 0u ? sk : -sk) * q;
}

float flowFast3(vec3 p) {
  vec2 i = floor(p.xy);
  vec2 f = p.xy - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float ph = p.z * 6.283185307179586;
  float c1 = cos(ph);
  float s1 = sin(ph);
  float c2 = c1 * c1 - s1 * s1;
  float s2 = 2.0 * s1 * c1;
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  uint rx0 = x0 ^ (x0 >> 16u);
  uint rx1 = x1 ^ (x1 >> 16u);
  float n00 = flowFastCorner((rx0 ^ y0) * ALT_FIB, f, c1, s1, c2, s2);
  float n10 = flowFastCorner((rx1 ^ y0) * ALT_FIB, f - vec2(1.0, 0.0), c1, s1, c2, s2);
  float n01 = flowFastCorner((rx0 ^ y1) * ALT_FIB, f - vec2(0.0, 1.0), c1, s1, c2, s2);
  float n11 = flowFastCorner((rx1 ^ y1) * ALT_FIB, f - vec2(1.0, 1.0), c1, s1, c2, s2);
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}
`

/** Flow 3D, 'fast-rot' fast implementation — GLSL spec. */
export const flow3dFastGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, FLOW_FAST_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * flowFast3(p)`,
}
