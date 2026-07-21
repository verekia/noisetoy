// WGSL counterpart of ripple-tileable.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from '../common.wgsl.js'
import { fmt, RIPPLE_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const RIPPLE_TILEABLE_WGSL = /* wgsl */ `
fn ripple2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let h2 = lowbias32(h);
      let o = vec2f(to01(h), to01(h2));
      let ph = to01(lowbias32(h2)) * 6.283185307179586;
      let v = vec2f(f32(dx), f32(dy)) + o - f;
      let d = length(v);
      let w = max(0.0, 1.0 - d / 1.5);
      sum += w * w * cos(d * 15.0 - ph);
    }
  }
  return sum;
}

fn ripple3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let h3 = lowbias32(h2);
        let o = vec3f(to01(h), to01(h2), to01(h3));
        let ph = to01(lowbias32(h3)) * 6.283185307179586;
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + o - f;
        let d = length(v);
        let w = max(0.0, 1.0 - d / 1.5);
        sum += w * w * cos(d * 15.0 - ph);
      }
    }
  }
  return sum;
}
`

/** Ripple 2D — Canonical tileable WGSL shader spec. */
export const ripple2dCanonicalTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, RIPPLE_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(RIPPLE_NORM)} * ripple2T(p, per)`,
}

/** Ripple 3D — Canonical tileable WGSL shader spec. */
export const ripple3dCanonicalTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, RIPPLE_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(RIPPLE_NORM)} * ripple3T(p, per)`,
}
