// WGSL counterpart of value.ts. Requires COMMON_WGSL.

export const VALUE_WGSL = /* wgsl */ `
fn value2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let n00 = to01(hash2u(ix, iy));
  let n10 = to01(hash2u(ix + 1, iy));
  let n01 = to01(hash2u(ix, iy + 1));
  let n11 = to01(hash2u(ix + 1, iy + 1));
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

fn value3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let n000 = to01(hash3u(ix, iy, iz));
  let n100 = to01(hash3u(ix + 1, iy, iz));
  let n010 = to01(hash3u(ix, iy + 1, iz));
  let n110 = to01(hash3u(ix + 1, iy + 1, iz));
  let n001 = to01(hash3u(ix, iy, iz + 1));
  let n101 = to01(hash3u(ix + 1, iy, iz + 1));
  let n011 = to01(hash3u(ix, iy + 1, iz + 1));
  let n111 = to01(hash3u(ix + 1, iy + 1, iz + 1));
  let nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  let nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
