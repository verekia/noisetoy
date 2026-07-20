// WGSL counterpart of white-tileable.ts. Requires COMMON_WGSL.

export const WHITE_TILEABLE_WGSL = /* wgsl */ `
fn white2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let x0 = imod(i32(i.x), i32(per.x));
  let y0 = imod(i32(i.y), i32(per.y));
  return to01(hash2u(x0, y0));
}

fn white3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let x0 = imod(i32(i.x), i32(per.x));
  let y0 = imod(i32(i.y), i32(per.y));
  return to01(hash3u(x0, y0, i32(i.z)));
}
`
