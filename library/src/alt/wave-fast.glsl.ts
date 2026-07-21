// GLSL counterpart of wave-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. The direction table becomes cos/sin of the quantized
// angle — trig is cheap on a GPU and matches the TS table values.
// 0.09817477042468103 is 2*pi/64; 0.02454369260617026 is 2*pi/256.

import { COMMON_GLSL } from '../noises/common.glsl.js'
import { FAST_COMMON_GLSL } from './fast-common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const WAVE_FAST_GLSL = /* glsl */ `
float wavFastCorner2(uint s0, vec2 d) {
  uint h = fibMix(s0);
  h ^= h >> 16u;
  float a = float(h >> 26u) * 0.09817477042468103;
  float ph = float((h >> 18u) & 255u) * 0.02454369260617026;
  return cos(dot(vec2(cos(a), sin(a)), d) * 12.566370614359172 + ph);
}

float wavFastCorner3(uint s, vec3 d) {
  uint h = lowbias32(s);
  float kz = float(h >> 22u) * (1.0 / 512.0) - 1.0;
  float a = float((h >> 16u) & 63u) * 0.09817477042468103;
  float ph = float((h >> 8u) & 255u) * 0.02454369260617026;
  float r = sqrt(1.0 - kz * kz);
  return cos(dot(vec3(r * cos(a), r * sin(a), kz), d) * 12.566370614359172 + ph);
}

float waveFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  float s00 = wavFastCorner2(x0 + y0, f);
  float s10 = wavFastCorner2(x1 + y0, f - vec2(1.0, 0.0));
  float s01 = wavFastCorner2(x0 + y1, f - vec2(0.0, 1.0));
  float s11 = wavFastCorner2(x1 + y1, f - vec2(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

float waveFast3(vec3 p) {
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
  float s000 = wavFastCorner3(x0 + y0 + z0, f);
  float s100 = wavFastCorner3(x1 + y0 + z0, f - vec3(1.0, 0.0, 0.0));
  float s010 = wavFastCorner3(x0 + y1 + z0, f - vec3(0.0, 1.0, 0.0));
  float s110 = wavFastCorner3(x1 + y1 + z0, f - vec3(1.0, 1.0, 0.0));
  float s001 = wavFastCorner3(x0 + y0 + z1, f - vec3(0.0, 0.0, 1.0));
  float s101 = wavFastCorner3(x1 + y0 + z1, f - vec3(1.0, 0.0, 1.0));
  float s011 = wavFastCorner3(x0 + y1 + z1, f - vec3(0.0, 1.0, 1.0));
  float s111 = wavFastCorner3(x1 + y1 + z1, f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  float nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Wave 2D, 'fast-dirs' fast implementation — GLSL spec. */
export const wave2dFastGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, WAVE_FAST_GLSL],
  expr: '0.5 + 0.5 * 1.0 * waveFast2(p)',
}

/** Wave 3D, 'fast-dirs' fast implementation — GLSL spec. */
export const wave3dFastGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FAST_COMMON_GLSL, WAVE_FAST_GLSL],
  expr: '0.5 + 0.5 * 1.0 * waveFast3(p)',
}
