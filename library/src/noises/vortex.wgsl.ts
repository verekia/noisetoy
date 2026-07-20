// WGSL counterpart of vortex.ts. Requires COMMON_WGSL.

export const VORTEX_WGSL = /* wgsl */ `
fn vortex2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let ux = fade(f.x);
  let uy = fade(f.y);
  var s = vec2f(0.0);
  for (var cy = 0; cy <= 1; cy++) {
    for (var cx = 0; cx <= 1; cx++) {
      let a = to01(hash2u(ix + cx, iy + cy)) * 6.283185307179586;
      var wx = ux;
      if (cx == 0) { wx = 1.0 - ux; }
      var wy = uy;
      if (cy == 0) { wy = 1.0 - uy; }
      s += wx * wy * vec2f(cos(a), sin(a));
    }
  }
  return cos(2.0 * atan2(s.y, s.x));
}

fn vortex3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  var s = vec2f(0.0);
  for (var cz = 0; cz <= 1; cz++) {
    for (var cy = 0; cy <= 1; cy++) {
      for (var cx = 0; cx <= 1; cx++) {
        let h = hash3u(ix + cx, iy + cy, iz + cz);
        let kz = to01(h) * 2.0 - 1.0;
        let a = to01(lowbias32(h)) * 6.283185307179586;
        let r = sqrt(max(0.0, 1.0 - kz * kz));
        var wx = ux;
        if (cx == 0) { wx = 1.0 - ux; }
        var wy = uy;
        if (cy == 0) { wy = 1.0 - uy; }
        var wz = uz;
        if (cz == 0) { wz = 1.0 - uz; }
        s += wx * wy * wz * r * vec2f(cos(a), sin(a));
      }
    }
  }
  return cos(2.0 * atan2(s.y, s.x));
}
`
