// WGSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_WGSL and PERLIN_TILEABLE_WGSL.

import { COMMON_WGSL } from '../common.wgsl.js'
import { PERLIN_WGSL } from '../perlin.wgsl.js'
import { PERLIN_TILEABLE_WGSL } from './perlin-tileable.wgsl.js'

import type { ShaderSpec } from '../../spec.js'

export const PERLIN_DERIVED_TILEABLE_WGSL = /* wgsl */ `
fn turb2T(p: vec2f, per: vec2f) -> f32 {
  return abs(perlin2T(p, per)) + 0.5 * abs(perlin2T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin2T(p * 4.0, per * 4.0));
}

fn turb3T(p: vec3f, per: vec2f) -> f32 {
  return abs(perlin3T(p, per)) + 0.5 * abs(perlin3T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin3T(p * 4.0, per * 4.0));
}

fn marble2T(p: vec2f, per: vec2f) -> f32 { return cos((p.x + 1.5 * turb2T(p, per)) * 3.141592653589793); }

fn marble3T(p: vec3f, per: vec2f) -> f32 { return cos((p.x + 1.5 * turb3T(p, per)) * 3.141592653589793); }

fn contour2T(p: vec2f, per: vec2f) -> f32 { return cos(perlin2T(p, per) * 12.0); }

fn contour3T(p: vec3f, per: vec2f) -> f32 { return cos(perlin3T(p, per) * 12.0); }
`

/** Marble 2D — Canonical tileable WGSL shader spec. */
export const marble2dCanonicalTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
  expr: '0.5 + 0.5 * marble2T(p, per)',
}

/** Marble 3D — Canonical tileable WGSL shader spec. */
export const marble3dCanonicalTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
  expr: '0.5 + 0.5 * marble3T(p, per)',
}

/** Contour 2D — Canonical tileable WGSL shader spec. */
export const contour2dCanonicalTileableWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
  expr: '0.5 + 0.5 * contour2T(p, per)',
}

/** Contour 3D — Canonical tileable WGSL shader spec. */
export const contour3dCanonicalTileableWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
  expr: '0.5 + 0.5 * contour3T(p, per)',
}
