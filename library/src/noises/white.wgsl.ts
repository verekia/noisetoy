// WGSL counterpart of white.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const WHITE_WGSL = /* wgsl */ `
fn white2(p: vec2f) -> f32 {
  let i = floor(p);
  return to01(hash2u(i32(i.x), i32(i.y)));
}

fn white3(p: vec3f) -> f32 {
  let i = floor(p);
  return to01(hash3u(i32(i.x), i32(i.y), i32(i.z)));
}
`

/** White 2D — Canonical WGSL shader spec. */
export const white2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, WHITE_WGSL],
  expr: 'white2(p)',
}

/** White 3D — Canonical WGSL shader spec. */
export const white3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, WHITE_WGSL],
  expr: 'white3(p)',
}
