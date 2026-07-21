// GLSL counterpart of wave.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'

import type { ShaderSpec } from '../spec.js'

export const WAVE_GLSL = /* glsl */ `
float waveCorner2(uint h, vec2 d) {
  float a = to01(h) * 6.283185307179586;
  float ph = to01(lowbias32(h)) * 6.283185307179586;
  return cos(dot(vec2(cos(a), sin(a)), d) * 12.566370614359172 + ph);
}

float waveCorner3(uint h, vec3 d) {
  float kz = to01(h) * 2.0 - 1.0;
  uint h2 = lowbias32(h);
  float a = to01(h2) * 6.283185307179586;
  float ph = to01(lowbias32(h2)) * 6.283185307179586;
  float r = sqrt(max(0.0, 1.0 - kz * kz));
  return cos(dot(vec3(r * cos(a), r * sin(a), kz), d) * 12.566370614359172 + ph);
}

float wave2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float s00 = waveCorner2(hash2u(ix, iy), f);
  float s10 = waveCorner2(hash2u(ix + 1, iy), f - vec2(1.0, 0.0));
  float s01 = waveCorner2(hash2u(ix, iy + 1), f - vec2(0.0, 1.0));
  float s11 = waveCorner2(hash2u(ix + 1, iy + 1), f - vec2(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

float wave3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  float s000 = waveCorner3(hash3u(ix, iy, iz), f);
  float s100 = waveCorner3(hash3u(ix + 1, iy, iz), f - vec3(1.0, 0.0, 0.0));
  float s010 = waveCorner3(hash3u(ix, iy + 1, iz), f - vec3(0.0, 1.0, 0.0));
  float s110 = waveCorner3(hash3u(ix + 1, iy + 1, iz), f - vec3(1.0, 1.0, 0.0));
  float s001 = waveCorner3(hash3u(ix, iy, iz + 1), f - vec3(0.0, 0.0, 1.0));
  float s101 = waveCorner3(hash3u(ix + 1, iy, iz + 1), f - vec3(1.0, 0.0, 1.0));
  float s011 = waveCorner3(hash3u(ix, iy + 1, iz + 1), f - vec3(0.0, 1.0, 1.0));
  float s111 = waveCorner3(hash3u(ix + 1, iy + 1, iz + 1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  float nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** GLSL spec for Wave 2D (shipping implementation). */
export const wave2dCanonicalGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, WAVE_GLSL],
  expr: '0.5 + 0.5 * wave2(p)',
}

/** GLSL spec for Wave 3D (shipping implementation). */
export const wave3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, WAVE_GLSL],
  expr: '0.5 + 0.5 * wave3(p)',
}
