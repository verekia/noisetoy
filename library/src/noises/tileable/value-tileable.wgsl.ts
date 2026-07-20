// WGSL counterpart of value-tileable.ts. Requires COMMON_WGSL.

export const VALUE_TILEABLE_WGSL = /* wgsl */ `
fn value2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let n00 = to01(hash2u(x0, y0));
  let n10 = to01(hash2u(x1, y0));
  let n01 = to01(hash2u(x0, y1));
  let n11 = to01(hash2u(x1, y1));
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

fn value3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let iz = i32(i.z);
  let n000 = to01(hash3u(x0, y0, iz));
  let n100 = to01(hash3u(x1, y0, iz));
  let n010 = to01(hash3u(x0, y1, iz));
  let n110 = to01(hash3u(x1, y1, iz));
  let n001 = to01(hash3u(x0, y0, iz + 1));
  let n101 = to01(hash3u(x1, y0, iz + 1));
  let n011 = to01(hash3u(x0, y1, iz + 1));
  let n111 = to01(hash3u(x1, y1, iz + 1));
  let nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  let nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
