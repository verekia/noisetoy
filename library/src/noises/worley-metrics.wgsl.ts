// WGSL counterpart of worley-metrics.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'
import { CHEBYSHEV2_NORM, CHEBYSHEV3_NORM, fmt, MANHATTAN2_NORM, MANHATTAN3_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_METRICS_WGSL = /* wgsl */ `
fn manhattan2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var f1 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let o = vec2f(to01(h), to01(lowbias32(h)));
      let v = abs(vec2f(f32(dx), f32(dy)) + o - f);
      f1 = min(f1, v.x + v.y);
    }
  }
  return f1;
}

fn manhattan3(p: vec3f) -> f32 {
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
        let v = abs(vec3f(f32(dx), f32(dy), f32(dz)) + o - f);
        f1 = min(f1, v.x + v.y + v.z);
      }
    }
  }
  return f1;
}

fn chebyshev2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var f1 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let o = vec2f(to01(h), to01(lowbias32(h)));
      let v = abs(vec2f(f32(dx), f32(dy)) + o - f);
      f1 = min(f1, max(v.x, v.y));
    }
  }
  return f1;
}

fn chebyshev3(p: vec3f) -> f32 {
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
        let v = abs(vec3f(f32(dx), f32(dy), f32(dz)) + o - f);
        f1 = min(f1, max(max(v.x, v.y), v.z));
      }
    }
  }
  return f1;
}
`

/** Worley (Manhattan) 2D — Canonical WGSL shader spec. */
export const worleyManhattan2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WORLEY_METRICS_WGSL],
  expr: `${fmt(MANHATTAN2_NORM)} * manhattan2(p)`,
}

/** Worley (Manhattan) 3D — Canonical WGSL shader spec. */
export const worleyManhattan3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WORLEY_METRICS_WGSL],
  expr: `${fmt(MANHATTAN3_NORM)} * manhattan3(p)`,
}

/** Worley (Chebyshev) 2D — Canonical WGSL shader spec. */
export const worleyChebyshev2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WORLEY_METRICS_WGSL],
  expr: `${fmt(CHEBYSHEV2_NORM)} * chebyshev2(p)`,
}

/** Worley (Chebyshev) 3D — Canonical WGSL shader spec. */
export const worleyChebyshev3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WORLEY_METRICS_WGSL],
  expr: `${fmt(CHEBYSHEV3_NORM)} * chebyshev3(p)`,
}
