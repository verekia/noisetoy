// WGSL counterpart of flow-tileable.ts. Requires COMMON_WGSL and FLOW_WGSL
// (for rotGradDot2).

import { COMMON_WGSL } from '../common.wgsl.js'
import { FLOW_WGSL } from '../flow.wgsl.js'
import { fmt, PERLIN2_NORM } from '../normalization.js'

import type { ShaderSpec } from '../../spec.js'

export const FLOW_TILEABLE_WGSL = /* wgsl */ `
fn flow3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p.xy);
  let f = p.xy - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let ph = p.z * 6.283185307179586;
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let g00 = rotGradDot2(hash2u(x0, y0), ph, f);
  let g10 = rotGradDot2(hash2u(x1, y0), ph, f - vec2f(1.0, 0.0));
  let g01 = rotGradDot2(hash2u(x0, y1), ph, f - vec2f(0.0, 1.0));
  let g11 = rotGradDot2(hash2u(x1, y1), ph, f - vec2f(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}
`

/** Flow 3D — Canonical tileable WGSL shader spec. */
export const flow3dCanonicalTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, FLOW_WGSL, FLOW_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(PERLIN2_NORM)} * flow3T(p, per)`,
}
