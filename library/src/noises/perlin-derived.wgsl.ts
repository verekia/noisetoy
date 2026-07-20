// WGSL counterpart of perlin-derived.ts. Requires COMMON_WGSL and PERLIN_WGSL.

export const PERLIN_DERIVED_WGSL = /* wgsl */ `
fn turb2(p: vec2f) -> f32 { return abs(perlin2(p)) + 0.5 * abs(perlin2(p * 2.0)) + 0.25 * abs(perlin2(p * 4.0)); }

fn turb3(p: vec3f) -> f32 { return abs(perlin3(p)) + 0.5 * abs(perlin3(p * 2.0)) + 0.25 * abs(perlin3(p * 4.0)); }

fn marble2(p: vec2f) -> f32 { return cos((p.x + 1.5 * turb2(p)) * 3.141592653589793); }

fn marble3(p: vec3f) -> f32 { return cos((p.x + 1.5 * turb3(p)) * 3.141592653589793); }

fn contour2(p: vec2f) -> f32 { return cos(perlin2(p) * 12.0); }

fn contour3(p: vec3f) -> f32 { return cos(perlin3(p) * 12.0); }
`
