// WGSL counterpart of gabor.ts. Requires COMMON_WGSL.
// 3.141592653589793 is GABOR_ENVELOPE; 12.566370614359172 is 2*pi*GABOR_FREQ.

import { COMMON_WGSL } from './common.wgsl.js'
import { fmt, GABOR2_NORM, GABOR3_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const GABOR_WGSL = /* wgsl */ `
fn gabor2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let h2 = lowbias32(h);
      let h3 = lowbias32(h2);
      let h4 = lowbias32(h3);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(h2)) - f;
      let ph = to01(h3) * 6.283185307179586;
      let w = to01(h4) * 2.0 - 1.0;
      let proj = gradDot2(lowbias32(h4), v);
      sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
    }
  }
  return sum;
}

fn gabor3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  var sum = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(ix + dx, iy + dy, iz + dz);
        let h2 = lowbias32(h);
        let h3 = lowbias32(h2);
        let h4 = lowbias32(h3);
        let h5 = lowbias32(h4);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(h3)) - f;
        let ph = to01(h4) * 6.283185307179586;
        let w = to01(h5) * 2.0 - 1.0;
        let proj = gradDot3(lowbias32(h5), v);
        sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
      }
    }
  }
  return sum;
}
`

/** Gabor 2D — Canonical WGSL shader spec. */
export const gabor2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, GABOR_WGSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR2_NORM)} * gabor2(p)`,
}

/** Gabor 3D — Canonical WGSL shader spec. */
export const gabor3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, GABOR_WGSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR3_NORM)} * gabor3(p)`,
}
