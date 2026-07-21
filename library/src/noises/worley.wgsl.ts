// WGSL counterpart of worley.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_WGSL = /* wgsl */ `
fn worley2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var f1 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let o = vec2f(to01(h), to01(lowbias32(h)));
      let v = vec2f(f32(dx), f32(dy)) + o - f;
      let d = dot(v, v);
      f1 = min(f1, d);
    }
  }
  return sqrt(f1);
}

fn worley3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  var f1 = 1e9;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(ix + dx, iy + dy, iz + dz);
        let h2 = lowbias32(h);
        let o = vec3f(to01(h), to01(h2), to01(lowbias32(h2)));
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + o - f;
        let d = dot(v, v);
        f1 = min(f1, d);
      }
    }
  }
  return sqrt(f1);
}
`

/** Worley 2D — Canonical WGSL shader spec. */
export const worley2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WORLEY_WGSL],
  expr: 'worley2(p)',
}

/** Worley 3D — Canonical WGSL shader spec. */
export const worley3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WORLEY_WGSL],
  expr: 'worley3(p)',
}
