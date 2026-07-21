// WGSL counterpart of truchet.ts. Requires COMMON_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const TRUCHET_WGSL = /* wgsl */ `
fn truchet2(p: vec2f) -> f32 {
  let i = floor(p);
  var f = p - i;
  if ((hash2u(i32(i.x), i32(i.y)) & 1u) == 1u) { f.x = 1.0 - f.x; }
  let d1 = abs(length(f) - 0.5);
  let d2 = abs(length(f - 1.0) - 0.5);
  let d = min(d1, d2);
  return cos(d * 6.283185307179586 * 3.0);
}
`

/** Truchet 2D — Canonical WGSL shader spec. */
export const truchet2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, TRUCHET_WGSL],
  expr: '0.5 + 0.5 * truchet2(p)',
}
