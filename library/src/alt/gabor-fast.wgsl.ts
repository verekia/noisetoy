// WGSL counterpart of gabor-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. See the GLSL file for the constant notes.

import { COMMON_WGSL } from '../noises/common.wgsl.js'
import { GABOR2_NORM, GABOR3_NORM, fmt } from '../noises/normalization.js'
import { FAST_COMMON_WGSL } from './fast-common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const GABOR_FAST_WGSL = /* wgsl */ `
fn gaborFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    let yh = yc + bitcast<u32>(dy) * LATTICE_HY;
    for (var dx = -1; dx <= 1; dx++) {
      let s = xc + bitcast<u32>(dx) * LATTICE_HX + yh;
      var h = fibMix(s);
      h ^= h >> 16u;
      let v = vec2f(f32(dx), f32(dy)) + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0) - f;
      let d2 = dot(v, v);
      if (d2 < 2.25) {
        let bh = (h ^ (h >> 15u)) * ALT_FIB;
        let w = f32((bh >> 10u) & 255u) * (1.0 / 128.0) - 1.0;
        let ph = f32((bh >> 18u) & 255u) * 0.02454369260617026;
        let a = f32(bh >> 26u) * 0.09817477042468103;
        let proj = dot(vec2f(cos(a), sin(a)), v);
        sum += w * exp(-3.141592653589793 * d2) * cos(12.566370614359172 * proj + ph);
      }
    }
  }
  return sum;
}

fn gaborFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  var sum = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    let zh = zc + bitcast<u32>(dz) * LATTICE_HZ;
    for (var dy = -1; dy <= 1; dy++) {
      let yh = yc + bitcast<u32>(dy) * LATTICE_HY + zh;
      for (var dx = -1; dx <= 1; dx++) {
        let s = xc + bitcast<u32>(dx) * LATTICE_HX + yh;
        let h = lowbias32(s);
        let v = vec3f(f32(dx), f32(dy), f32(dz))
          + vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0) - f;
        let d2 = dot(v, v);
        if (d2 < 2.25) {
          let bh = (h ^ (h >> 15u)) * ALT_FIB;
          let w = f32((bh >> 2u) & 255u) * (1.0 / 128.0) - 1.0;
          let ph = f32((bh >> 10u) & 255u) * 0.02454369260617026;
          let a = f32((bh >> 20u) & 63u) * 0.09817477042468103;
          let kz = f32(bh >> 26u) * 0.03125 - 0.984375;
          let r = sqrt(1.0 - kz * kz);
          let proj = dot(vec3f(r * cos(a), r * sin(a), kz), v);
          sum += w * exp(-3.141592653589793 * d2) * cos(12.566370614359172 * proj + ph);
        }
      }
    }
  }
  return sum;
}
`

/** Gabor 2D Fast (split-bits-gated candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const gabor2dFastWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, GABOR_FAST_WGSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR2_NORM)} * gaborFast2(p)`,
}

/** Gabor 3D Fast (split-bits-gated candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const gabor3dFastWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, GABOR_FAST_WGSL],
  expr: `0.5 + 0.5 * ${fmt(GABOR3_NORM)} * gaborFast3(p)`,
}
