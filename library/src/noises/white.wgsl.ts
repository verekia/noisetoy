// WGSL counterpart of white.ts. Requires COMMON_WGSL.

export const WHITE_WGSL = /* wgsl */ `
fn white2(p: vec2f) -> f32 {
  let i = floor(p);
  return to01(hash2u(i32(i.x), i32(i.y)));
}

fn white3(p: vec3f) -> f32 {
  let i = floor(p);
  return to01(hash3u(i32(i.x), i32(i.y), i32(i.z)));
}
`
