// WGSL counterpart of truchet-tileable.ts. Requires COMMON_WGSL.

export const TRUCHET_TILEABLE_WGSL = /* wgsl */ `
fn truchet2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  var f = p - i;
  if ((hash2u(imod(i32(i.x), i32(per.x)), imod(i32(i.y), i32(per.y))) & 1u) == 1u) { f.x = 1.0 - f.x; }
  let d1 = abs(length(f) - 0.5);
  let d2 = abs(length(f - 1.0) - 0.5);
  return cos(min(d1, d2) * 6.283185307179586 * 3.0);
}
`
