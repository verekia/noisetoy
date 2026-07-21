// WGSL counterpart of perlin-fast-tileable.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. Period baked at 8 cells; `& 7` on the signed lattice
// coordinate is two's-complement AND, defined for negatives in WGSL.

import { COMMON_WGSL } from '../noises/common.wgsl.js'
import { PERLIN2_NORM, PERLIN3_NORM, fmt } from '../noises/normalization.js'
import { FAST_COMMON_WGSL } from './fast-common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_FAST_TILEABLE_WGSL = /* wgsl */ `
fn perlinFastT2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let s = f.x + f.y;
  let d = f.x - f.y;
  let s1 = s - 1.0;
  let x0 = u32(i32(i.x) & 7) * LATTICE_HX;
  let x1 = u32((i32(i.x) + 1) & 7) * LATTICE_HX;
  let y0 = u32(i32(i.y) & 7) * LATTICE_HY;
  let y1 = u32((i32(i.y) + 1) & 7) * LATTICE_HY;
  let rx0 = x0 ^ (x0 >> 16u);
  let rx1 = x1 ^ (x1 >> 16u);
  let g00 = pickSD((rx0 ^ y0) * ALT_FIB, s, d);
  let g10 = pickSD((rx1 ^ y0) * ALT_FIB, s1, d - 1.0);
  let g01 = pickSD((rx0 ^ y1) * ALT_FIB, s1, d + 1.0);
  let g11 = pickSD((rx1 ^ y1) * ALT_FIB, s - 2.0, d);
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}

fn perlinFastT3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let x0 = u32(i32(i.x) & 7) * LATTICE_HX;
  let x1 = u32((i32(i.x) + 1) & 7) * LATTICE_HX;
  let y0 = u32(i32(i.y) & 7) * LATTICE_HY;
  let y1 = u32((i32(i.y) + 1) & 7) * LATTICE_HY;
  let z0 = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let z1 = z0 + LATTICE_HZ;
  let xy00 = x0 + y0;
  let xy10 = x1 + y0;
  let xy01 = x0 + y1;
  let xy11 = x1 + y1;
  let g000 = gradFast3(lmfMix(xy00 + z0), f);
  let g100 = gradFast3(lmfMix(xy10 + z0), f - vec3f(1.0, 0.0, 0.0));
  let g010 = gradFast3(lmfMix(xy01 + z0), f - vec3f(0.0, 1.0, 0.0));
  let g110 = gradFast3(lmfMix(xy11 + z0), f - vec3f(1.0, 1.0, 0.0));
  let g001 = gradFast3(lmfMix(xy00 + z1), f - vec3f(0.0, 0.0, 1.0));
  let g101 = gradFast3(lmfMix(xy10 + z1), f - vec3f(1.0, 0.0, 1.0));
  let g011 = gradFast3(lmfMix(xy01 + z1), f - vec3f(0.0, 1.0, 1.0));
  let g111 = gradFast3(lmfMix(xy11 + z1), f - vec3f(1.0, 1.0, 1.0));
  let nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  let nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`

/** Perlin 2D Fast, tileable at a baked period of 8 cells (fib-hash-tileable candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const perlin2dFastTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, PERLIN_FAST_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * perlinFastT2(p)`,
}

/** Perlin 3D Fast, x/y tileable at a baked period of 8 cells (fib-hash-tileable candidate) — WGSL ShaderSpec, pre-clamp display expression. */
export const perlin3dFastTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, FAST_COMMON_WGSL, PERLIN_FAST_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN3_NORM)} * perlinFastT3(p)`,
}
