// WGSL counterpart of wave.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const WAVE_WGSL = /* wgsl */ `
fn waveCorner2(h: u32, d: vec2f) -> f32 {
  let a = to01(h) * 6.283185307179586;
  let ph = to01(lowbias32(h)) * 6.283185307179586;
  return cos(dot(vec2f(cos(a), sin(a)), d) * 12.566370614359172 + ph);
}

fn waveCorner3(h: u32, d: vec3f) -> f32 {
  let kz = to01(h) * 2.0 - 1.0;
  let h2 = lowbias32(h);
  let a = to01(h2) * 6.283185307179586;
  let ph = to01(lowbias32(h2)) * 6.283185307179586;
  let r = sqrt(max(0.0, 1.0 - kz * kz));
  return cos(dot(vec3f(r * cos(a), r * sin(a), kz), d) * 12.566370614359172 + ph);
}

fn wave2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let s00 = waveCorner2(hash2u(ix, iy), f);
  let s10 = waveCorner2(hash2u(ix + 1, iy), f - vec2f(1.0, 0.0));
  let s01 = waveCorner2(hash2u(ix, iy + 1), f - vec2f(0.0, 1.0));
  let s11 = waveCorner2(hash2u(ix + 1, iy + 1), f - vec2f(1.0, 1.0));
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy);
}

fn wave3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let s000 = waveCorner3(hash3u(ix, iy, iz), f);
  let s100 = waveCorner3(hash3u(ix + 1, iy, iz), f - vec3f(1.0, 0.0, 0.0));
  let s010 = waveCorner3(hash3u(ix, iy + 1, iz), f - vec3f(0.0, 1.0, 0.0));
  let s110 = waveCorner3(hash3u(ix + 1, iy + 1, iz), f - vec3f(1.0, 1.0, 0.0));
  let s001 = waveCorner3(hash3u(ix, iy, iz + 1), f - vec3f(0.0, 0.0, 1.0));
  let s101 = waveCorner3(hash3u(ix + 1, iy, iz + 1), f - vec3f(1.0, 0.0, 1.0));
  let s011 = waveCorner3(hash3u(ix, iy + 1, iz + 1), f - vec3f(0.0, 1.0, 1.0));
  let s111 = waveCorner3(hash3u(ix + 1, iy + 1, iz + 1), f - vec3f(1.0, 1.0, 1.0));
  let nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy);
  let nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Wave 2D — Canonical WGSL shader spec. */
export const wave2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WAVE_WGSL],
  expr: '0.5 + 0.5 * wave2(p)',
}

/** Wave 3D — Canonical WGSL shader spec. */
export const wave3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WAVE_WGSL],
  expr: '0.5 + 0.5 * wave3(p)',
}
