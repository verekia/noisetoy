// GLSL counterpart of flow.ts. Requires COMMON_GLSL.

import { COMMON_GLSL } from './common.glsl.js'
import { fmt, PERLIN2_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const FLOW_GLSL = /* glsl */ `
float rotGradDot2(uint h, float phase, vec2 d) {
  uint b = lowbias32(h) & 3u;
  float k = float(1u + (b >> 1u)) * (1.0 - 2.0 * float(b & 1u));
  float a = to01(h) * 6.283185307179586 + k * phase;
  return dot(vec2(cos(a), sin(a)), d);
}

float flow3(vec3 p) {
  vec2 i = floor(p.xy);
  vec2 f = p.xy - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float ph = p.z * 6.283185307179586;
  float g00 = rotGradDot2(hash2u(ix, iy), ph, f);
  float g10 = rotGradDot2(hash2u(ix + 1, iy), ph, f - vec2(1.0, 0.0));
  float g01 = rotGradDot2(hash2u(ix, iy + 1), ph, f - vec2(0.0, 1.0));
  float g11 = rotGradDot2(hash2u(ix + 1, iy + 1), ph, f - vec2(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}
`

/** GLSL spec for Flow 3D (shipping implementation). */
export const flow3dCanonicalGlsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_GLSL, FLOW_GLSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * flow3(p)`,
}
