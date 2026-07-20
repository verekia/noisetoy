// WGSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_WGSL and PERLIN_TILEABLE_WGSL.

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
