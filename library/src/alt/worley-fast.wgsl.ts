// WGSL counterpart of worley-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. See the GLSL file for the divergence caveat on the
// pruning branches.

import { COMMON_WGSL } from '../noises/common.wgsl.js'
import { FAST_COMMON_WGSL } from './fast-common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_FAST_WGSL = /* wgsl */ `
fn worleyFastCell2(s: u32, b: vec2f, f1: f32) -> f32 {
  var h = fibMix(s);
  h ^= h >> 16u;
  let v = b + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
  return min(f1, dot(v, v));
}

fn worleyFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = worleyFastCell2(xc + yc, vec2f(-f.x, -f.y), 1e9);
  f1 = worleyFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), f1);
  f1 = worleyFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), f1);
  if (f.x * f.x < f1) {
    let xm = xc - LATTICE_HX;
    f1 = worleyFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), f1);
    f1 = worleyFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = worleyFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), f1);
  }
  let gx = 1.0 - f.x;
  if (gx * gx < f1) {
    let xp = xc + LATTICE_HX;
    f1 = worleyFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), f1);
    f1 = worleyFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), f1);
    f1 = worleyFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), f1);
  }
  return sqrt(f1);
}

fn worleyFastCell3(s: u32, b: vec3f, f1: f32) -> f32 {
  let h = lowbias32(s);
  let o = vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  let v = b + o;
  return min(f1, dot(v, v));
}

fn worleyFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zz: f32, f1in: f32) -> f32 {
  var f1 = f1in;
  f1 = worleyFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), f1);
  f1 = worleyFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = worleyFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (fxy.x * fxy.x + zz < f1) {
    let xm = xc - LATTICE_HX;
    f1 = worleyFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = worleyFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = worleyFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  let gx = 1.0 - fxy.x;
  if (gx * gx + zz < f1) {
    let xp = xc + LATTICE_HX;
    f1 = worleyFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = worleyFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = worleyFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

fn worleyFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = worleyFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  let zzm = f.z * f.z;
  if (zzm < f1) {
    let zm = zc - LATTICE_HZ;
    f1 = worleyFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, f1);
  }
  let gz = 1.0 - f.z;
  let zzp = gz * gz;
  if (zzp < f1) {
    let zp = zc + LATTICE_HZ;
    f1 = worleyFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, f1);
  }
  return sqrt(f1);
}
`

/** Worley 2D Fast (split-bits-pruned candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const worley2dFastWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, WORLEY_FAST_WGSL],
  expr: 'worleyFast2(p)',
}

/** Worley 3D Fast (split-bits-pruned candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const worley3dFastWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, WORLEY_FAST_WGSL],
  expr: 'worleyFast3(p)',
}
