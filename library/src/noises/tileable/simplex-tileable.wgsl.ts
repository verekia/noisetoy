// WGSL counterpart of simplex-tileable.ts. Requires COMMON_WGSL and SIMPLEX4_WGSL.

import { COMMON_WGSL } from '../common.wgsl.js'
import { fmt, SIMPLEX4_NORM } from '../normalization.js'
import { SIMPLEX4_WGSL } from '../simplex4.wgsl.js'

import type { ShaderSpec } from '../../spec.js'

export const SIMPLEX_TILEABLE_WGSL = /* wgsl */ `
fn simplex2T(p: vec2f, per: vec2f) -> f32 {
  let TAU = 6.283185307179586;
  let a = p / per * TAU;
  let r = per / TAU;
  return simplex4(vec4f(r.x * cos(a.x), r.x * sin(a.x), r.y * cos(a.y), r.y * sin(a.y)));
}
`

/** Simplex 2D — Canonical tileable (torus) WGSL shader spec. */
export const simplex2dCanonicalTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, SIMPLEX4_WGSL, SIMPLEX_TILEABLE_WGSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX4_NORM)} * simplex2T(p, per)`,
}
