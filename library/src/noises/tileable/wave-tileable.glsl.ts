// GLSL counterpart of wave-tileable.ts. Requires COMMON_GLSL and WAVE_GLSL
// (reuses waveCorner2/waveCorner3).

import { COMMON_GLSL } from '../common.glsl.js'
import { WAVE_GLSL } from '../wave.glsl.js'

import type { ShaderSpec } from '../../spec.js'

export const WAVE_TILEABLE_GLSL = /* glsl */ `
float wave2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  int px = int(per.x);
  int py = int(per.y);
  int x0 = imod(int(i.x), px);
  int x1 = imod(int(i.x) + 1, px);
  int y0 = imod(int(i.y), py);
  int y1 = imod(int(i.y) + 1, py);
  float s00 = waveCorner2(hash2u(x0, y0), f);
  float s10 = waveCorner2(hash2u(x1, y0), f - vec2(1.0, 0.0));
  float s01 = waveCorner2(hash2u(x0, y1), f - vec2(0.0, 1.0));
  float s11 = waveCorner2(hash2u(x1, y1), f - vec2(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

float wave3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  int px = int(per.x);
  int py = int(per.y);
  int x0 = imod(int(i.x), px);
  int x1 = imod(int(i.x) + 1, px);
  int y0 = imod(int(i.y), py);
  int y1 = imod(int(i.y) + 1, py);
  int iz = int(i.z);
  float s000 = waveCorner3(hash3u(x0, y0, iz), f);
  float s100 = waveCorner3(hash3u(x1, y0, iz), f - vec3(1.0, 0.0, 0.0));
  float s010 = waveCorner3(hash3u(x0, y1, iz), f - vec3(0.0, 1.0, 0.0));
  float s110 = waveCorner3(hash3u(x1, y1, iz), f - vec3(1.0, 1.0, 0.0));
  float s001 = waveCorner3(hash3u(x0, y0, iz + 1), f - vec3(0.0, 0.0, 1.0));
  float s101 = waveCorner3(hash3u(x1, y0, iz + 1), f - vec3(1.0, 0.0, 1.0));
  float s011 = waveCorner3(hash3u(x0, y1, iz + 1), f - vec3(0.0, 1.0, 1.0));
  float s111 = waveCorner3(hash3u(x1, y1, iz + 1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  float nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** GLSL spec for Wave 2D, tileable (shipping implementation). */
export const wave2dCanonicalTileableGlsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_GLSL, WAVE_GLSL, WAVE_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * wave2T(p, per)',
}

/** GLSL spec for Wave 3D, tileable (shipping implementation). */
export const wave3dCanonicalTileableGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, WAVE_GLSL, WAVE_TILEABLE_GLSL],
  expr: '0.5 + 0.5 * wave3T(p, per)',
}
