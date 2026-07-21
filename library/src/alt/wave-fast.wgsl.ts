// WGSL counterpart of wave-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. See the GLSL file for the quantized-angle note.

import { COMMON_WGSL } from '../noises/common.wgsl.js'
import { FAST_COMMON_WGSL } from './fast-common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const WAVE_FAST_WGSL = /* wgsl */ `
fn wavFastCorner2(s0: u32, d: vec2f) -> f32 {
  var h = fibMix(s0);
  h ^= h >> 16u;
  let a = f32(h >> 26u) * 0.09817477042468103;
  let ph = f32((h >> 18u) & 255u) * 0.02454369260617026;
  return cos(dot(vec2f(cos(a), sin(a)), d) * 12.566370614359172 + ph);
}

fn wavFastCorner3(s: u32, d: vec3f) -> f32 {
  let h = lowbias32(s);
  let kz = f32(h >> 22u) * (1.0 / 512.0) - 1.0;
  let a = f32((h >> 16u) & 63u) * 0.09817477042468103;
  let ph = f32((h >> 8u) & 255u) * 0.02454369260617026;
  let r = sqrt(1.0 - kz * kz);
  return cos(dot(vec3f(r * cos(a), r * sin(a), kz), d) * 12.566370614359172 + ph);
}

fn waveFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let s00 = wavFastCorner2(x0 + y0, f);
  let s10 = wavFastCorner2(x1 + y0, f - vec2f(1.0, 0.0));
  let s01 = wavFastCorner2(x0 + y1, f - vec2f(0.0, 1.0));
  let s11 = wavFastCorner2(x1 + y1, f - vec2f(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

fn waveFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let z0 = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let z1 = z0 + LATTICE_HZ;
  let s000 = wavFastCorner3(x0 + y0 + z0, f);
  let s100 = wavFastCorner3(x1 + y0 + z0, f - vec3f(1.0, 0.0, 0.0));
  let s010 = wavFastCorner3(x0 + y1 + z0, f - vec3f(0.0, 1.0, 0.0));
  let s110 = wavFastCorner3(x1 + y1 + z0, f - vec3f(1.0, 1.0, 0.0));
  let s001 = wavFastCorner3(x0 + y0 + z1, f - vec3f(0.0, 0.0, 1.0));
  let s101 = wavFastCorner3(x1 + y0 + z1, f - vec3f(1.0, 0.0, 1.0));
  let s011 = wavFastCorner3(x0 + y1 + z1, f - vec3f(0.0, 1.0, 1.0));
  let s111 = wavFastCorner3(x1 + y1 + z1, f - vec3f(1.0, 1.0, 1.0));
  let nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  let nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Wave 2D Fast (fast-dirs candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const wave2dFastWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, WAVE_FAST_WGSL],
  expr: '0.5 + 0.5 * 1.0 * waveFast2(p)',
}

/** Wave 3D Fast (fast-dirs candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const wave3dFastWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, WAVE_FAST_WGSL],
  expr: '0.5 + 0.5 * 1.0 * waveFast3(p)',
}
