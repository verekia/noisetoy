// WGSL counterpart of simplex-tileable.ts. Requires COMMON_WGSL and SIMPLEX4_WGSL.

export const SIMPLEX_TILEABLE_WGSL = /* wgsl */ `
fn simplex2T(p: vec2f, per: vec2f) -> f32 {
  let TAU = 6.283185307179586;
  let a = p / per * TAU;
  let r = per / TAU;
  return simplex4(vec4f(r.x * cos(a.x), r.x * sin(a.x), r.y * cos(a.y), r.y * sin(a.y)));
}
`
