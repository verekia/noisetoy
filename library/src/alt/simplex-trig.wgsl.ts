// WGSL counterpart of simplex.ts. Requires COMMON_WGSL.

export const SIMPLEX_TRIG_WGSL = /* wgsl */ `
fn trigContrib2(d: vec2f, h: u32) -> f32 {
  var t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * gradDot2(h, d);
}

fn trigContrib3(d: vec3f, h: u32) -> f32 {
  var t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * gradDot3(h, d);
}

fn simplexTrig2(p: vec2f) -> f32 {
  let F2 = 0.3660254037844386;
  let G2 = 0.21132486540518713;
  let s = (p.x + p.y) * F2;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let t = f32(i + j) * G2;
  let d0 = p - (vec2f(f32(i), f32(j)) - t);
  var i1 = 0;
  if (d0.x > d0.y) { i1 = 1; }
  let j1 = 1 - i1;
  let d1 = d0 - vec2f(f32(i1), f32(j1)) + G2;
  let d2 = d0 - 1.0 + 2.0 * G2;
  return trigContrib2(d0, hash2u(i, j)) + trigContrib2(d1, hash2u(i + i1, j + j1)) + trigContrib2(d2, hash2u(i + 1, j + 1));
}

fn simplexTrig3(p: vec3f) -> f32 {
  let F3 = 1.0 / 3.0;
  let G3 = 1.0 / 6.0;
  let s = (p.x + p.y + p.z) * F3;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let t = f32(i + j + k) * G3;
  let d0 = p - (vec3f(f32(i), f32(j), f32(k)) - t);
  var i1 = 0; var j1 = 0; var k1 = 0;
  var i2 = 0; var j2 = 0; var k2 = 0;
  if (d0.x >= d0.y) {
    if (d0.y >= d0.z) { i1 = 1; i2 = 1; j2 = 1; }
    else if (d0.x >= d0.z) { i1 = 1; i2 = 1; k2 = 1; }
    else { k1 = 1; i2 = 1; k2 = 1; }
  } else {
    if (d0.y < d0.z) { k1 = 1; j2 = 1; k2 = 1; }
    else if (d0.x < d0.z) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
  }
  let d1 = d0 - vec3f(f32(i1), f32(j1), f32(k1)) + G3;
  let d2 = d0 - vec3f(f32(i2), f32(j2), f32(k2)) + 2.0 * G3;
  let d3 = d0 - 1.0 + 3.0 * G3;
  return trigContrib3(d0, hash3u(i, j, k)) + trigContrib3(d1, hash3u(i + i1, j + j1, k + k1)) +
    trigContrib3(d2, hash3u(i + i2, j + j2, k + k2)) + trigContrib3(d3, hash3u(i + 1, j + 1, k + 1));
}
`
