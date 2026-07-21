// WGSL counterpart of simplex-loop.ts. Requires COMMON_WGSL and SIMPLEX4_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'
import { fmt, SIMPLEX4_NORM } from './normalization.js'
import { SIMPLEX4_WGSL } from './simplex4.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const SIMPLEX_LOOP_WGSL = /* wgsl */ `
fn simplexLoop3(p: vec3f) -> f32 {
  let a = p.z * 6.283185307179586;
  return simplex4(vec4f(p.x, p.y, 0.15915494309189535 * cos(a), 0.15915494309189535 * sin(a)));
}
`

/** Simplex Loop 3D — Canonical WGSL shader spec. */
export const simplexLoop3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, SIMPLEX4_WGSL, SIMPLEX_LOOP_WGSL],
  expr: `0.5 + 0.5 * ${fmt(SIMPLEX4_NORM)} * simplexLoop3(p)`,
}
