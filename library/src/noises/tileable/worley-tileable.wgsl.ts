// WGSL counterpart of worley-tileable.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from '../common.wgsl.js'

import type { ShaderSpec } from '../../spec.js'

export const WORLEY_TILEABLE_WGSL = /* wgsl */ `
fn worley2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var f1 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let o = vec2f(to01(h), to01(lowbias32(h)));
      let v = vec2f(f32(dx), f32(dy)) + o - f;
      let d = dot(v, v);
      f1 = min(f1, d);
    }
  }
  return sqrt(f1);
}

fn worley3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var f1 = 1e9;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
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

/** Worley 2D — Canonical tileable WGSL shader spec. */
export const worley2dCanonicalTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WORLEY_TILEABLE_WGSL],
  expr: 'worley2T(p, per)',
}

/** Worley 3D — Canonical tileable WGSL shader spec. */
export const worley3dCanonicalTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WORLEY_TILEABLE_WGSL],
  expr: 'worley3T(p, per)',
}
