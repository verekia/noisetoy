// WGSL counterpart of cellular.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'
import { CRACKLE_NORM, fmt, STARS_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const CELLULAR_WGSL = /* wgsl */ `
fn mosaic2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var best = 1e9;
  var bh = 0u;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let d2 = dot(v, v);
      if (d2 < best) { best = d2; bh = h; }
    }
  }
  return to01(lowbias32(lowbias32(bh)));
}

fn mosaic3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  var best = 1e9;
  var bh = 0u;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(ix + dx, iy + dy, iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let d2 = dot(v, v);
        if (d2 < best) { best = d2; bh = h; }
      }
    }
  }
  return to01(lowbias32(lowbias32(lowbias32(bh))));
}

fn crackle2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var f1 = 1e9;
  var f2 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let d2 = dot(v, v);
      if (d2 < f1) { f2 = f1; f1 = d2; }
      else if (d2 < f2) { f2 = d2; }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

fn crackle3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  var f1 = 1e9;
  var f2 = 1e9;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(ix + dx, iy + dy, iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let d2 = dot(v, v);
        if (d2 < f1) { f2 = f1; f1 = d2; }
        else if (d2 < f2) { f2 = d2; }
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

fn foam2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var m = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let t = 1.21 - dot(v, v);
      if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
    }
  }
  return m;
}

fn foam3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  var m = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(ix + dx, iy + dy, iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let t = 1.21 - dot(v, v);
        if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
      }
    }
  }
  return m;
}

fn stars2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(ix + dx, iy + dy);
      let h2 = lowbias32(h);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(h2)) - f;
      sum += to01(lowbias32(h2)) * exp(-dot(v, v) * 18.0);
    }
  }
  return sum;
}

fn stars3(p: vec3f) -> f32 {
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
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(h3)) - f;
        sum += to01(lowbias32(h3)) * exp(-dot(v, v) * 18.0);
      }
    }
  }
  return sum;
}
`

/** Mosaic 2D — Canonical WGSL shader spec. */
export const mosaic2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: 'mosaic2(p)',
}

/** Mosaic 3D — Canonical WGSL shader spec. */
export const mosaic3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: 'mosaic3(p)',
}

/** Crackle 2D — Canonical WGSL shader spec. */
export const crackle2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle2(p)`,
}

/** Crackle 3D — Canonical WGSL shader spec. */
export const crackle3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: `${fmt(CRACKLE_NORM)} * crackle3(p)`,
}

/** Foam 2D — Canonical WGSL shader spec. */
export const foam2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: 'foam2(p)',
}

/** Foam 3D — Canonical WGSL shader spec. */
export const foam3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: 'foam3(p)',
}

/** Stars 2D — Canonical WGSL shader spec. */
export const stars2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: `${fmt(STARS_NORM)} * stars2(p)`,
}

/** Stars 3D — Canonical WGSL shader spec. */
export const stars3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, CELLULAR_WGSL],
  expr: `${fmt(STARS_NORM)} * stars3(p)`,
}
