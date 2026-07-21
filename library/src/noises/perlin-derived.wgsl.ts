// WGSL counterpart of perlin-derived.ts. Requires COMMON_WGSL and PERLIN_WGSL.

import { COMMON_WGSL } from './common.wgsl.js'
import { PERLIN_WGSL } from './perlin.wgsl.js'

import type { ShaderSpec } from '../spec.js'

export const PERLIN_DERIVED_WGSL = /* wgsl */ `
fn turb2(p: vec2f) -> f32 { return abs(perlin2(p)) + 0.5 * abs(perlin2(p * 2.0)) + 0.25 * abs(perlin2(p * 4.0)); }

fn turb3(p: vec3f) -> f32 { return abs(perlin3(p)) + 0.5 * abs(perlin3(p * 2.0)) + 0.25 * abs(perlin3(p * 4.0)); }

fn marble2(p: vec2f) -> f32 { return cos((p.x + 1.5 * turb2(p)) * 3.141592653589793); }

fn marble3(p: vec3f) -> f32 { return cos((p.x + 1.5 * turb3(p)) * 3.141592653589793); }

fn contour2(p: vec2f) -> f32 { return cos(perlin2(p) * 12.0); }

fn contour3(p: vec3f) -> f32 { return cos(perlin3(p) * 12.0); }
`

/** Marble 2D — Canonical WGSL shader spec. */
export const marble2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_DERIVED_WGSL],
  expr: '0.5 + 0.5 * marble2(p)',
}

/** Marble 3D — Canonical WGSL shader spec. */
export const marble3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_DERIVED_WGSL],
  expr: '0.5 + 0.5 * marble3(p)',
}

/** Contour 2D — Canonical WGSL shader spec. */
export const contour2dCanonicalWgsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_DERIVED_WGSL],
  expr: '0.5 + 0.5 * contour2(p)',
}

/** Contour 3D — Canonical WGSL shader spec. */
export const contour3dCanonicalWgsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_WGSL, PERLIN_WGSL, PERLIN_DERIVED_WGSL],
  expr: '0.5 + 0.5 * contour3(p)',
}
