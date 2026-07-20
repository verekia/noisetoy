// WGSL counterpart of gabor-tileable.ts. Requires COMMON_WGSL.

export const GABOR_TILEABLE_WGSL = /* wgsl */ `
fn gabor2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let h2 = lowbias32(h);
      let h3 = lowbias32(h2);
      let h4 = lowbias32(h3);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(h2)) - f;
      let ph = to01(h3) * 6.283185307179586;
      let w = to01(h4) * 2.0 - 1.0;
      let proj = gradDot2(lowbias32(h4), v);
      sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
    }
  }
  return sum;
}

fn gabor3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let h3 = lowbias32(h2);
        let h4 = lowbias32(h3);
        let h5 = lowbias32(h4);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(h3)) - f;
        let ph = to01(h4) * 6.283185307179586;
        let w = to01(h5) * 2.0 - 1.0;
        let proj = gradDot3(lowbias32(h5), v);
        sum += w * exp(-3.141592653589793 * dot(v, v)) * cos(12.566370614359172 * proj + ph);
      }
    }
  }
  return sum;
}
`
