// WGSL counterpart of value-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL.

export const VALUE_FAST_WGSL = /* wgsl */ `
fn valFastCorner2(s: u32) -> f32 {
  var h = fibMix(s);
  h ^= h >> 16u;
  return f32(h >> 16u) * (1.0 / 65536.0);
}

fn valFastCorner3(s: u32) -> f32 {
  return f32(lowbias32(s) >> 8u) * (1.0 / 16777216.0);
}

fn valueFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let n00 = valFastCorner2(x0 + y0);
  let n10 = valFastCorner2(x1 + y0);
  let n01 = valFastCorner2(x0 + y1);
  let n11 = valFastCorner2(x1 + y1);
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

fn valueFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let z0 = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let z1 = z0 + LATTICE_HZ;
  let n000 = valFastCorner3(x0 + y0 + z0);
  let n100 = valFastCorner3(x1 + y0 + z0);
  let n010 = valFastCorner3(x0 + y1 + z0);
  let n110 = valFastCorner3(x1 + y1 + z0);
  let n001 = valFastCorner3(x0 + y0 + z1);
  let n101 = valFastCorner3(x1 + y0 + z1);
  let n011 = valFastCorner3(x0 + y1 + z1);
  let n111 = valFastCorner3(x1 + y1 + z1);
  let nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  let nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
