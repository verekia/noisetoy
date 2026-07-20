// WGSL counterpart of simplex4.ts. Requires COMMON_WGSL.

export const SIMPLEX4_WGSL = /* wgsl */ `
fn grad4Dot(h: u32, d: vec4f) -> f32 {
  let b = h & 31u;
  let zi = b >> 3u;
  var s0 = 1.0;
  if ((b & 1u) != 0u) { s0 = -1.0; }
  var s1 = 1.0;
  if ((b & 2u) != 0u) { s1 = -1.0; }
  var s2 = 1.0;
  if ((b & 4u) != 0u) { s2 = -1.0; }
  if (zi == 0u) { return s0 * d.y + s1 * d.z + s2 * d.w; }
  if (zi == 1u) { return s0 * d.x + s1 * d.z + s2 * d.w; }
  if (zi == 2u) { return s0 * d.x + s1 * d.y + s2 * d.w; }
  return s0 * d.x + s1 * d.y + s2 * d.z;
}

fn contrib4(d: vec4f, h: u32) -> f32 {
  var t = 0.6 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * grad4Dot(h, d);
}

fn simplex4(p: vec4f) -> f32 {
  let F4 = 0.30901699437494745;
  let G4 = 0.1381966011250105;
  let s = (p.x + p.y + p.z + p.w) * F4;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let l = i32(floor(p.w + s));
  let t = f32(i + j + k + l) * G4;
  let d0 = p - (vec4f(f32(i), f32(j), f32(k), f32(l)) - t);
  var rankx = 0; var ranky = 0; var rankz = 0; var rankw = 0;
  if (d0.x > d0.y) { rankx++; } else { ranky++; }
  if (d0.x > d0.z) { rankx++; } else { rankz++; }
  if (d0.x > d0.w) { rankx++; } else { rankw++; }
  if (d0.y > d0.z) { ranky++; } else { rankz++; }
  if (d0.y > d0.w) { ranky++; } else { rankw++; }
  if (d0.z > d0.w) { rankz++; } else { rankw++; }
  var i1 = 0; if (rankx >= 3) { i1 = 1; }
  var j1 = 0; if (ranky >= 3) { j1 = 1; }
  var k1 = 0; if (rankz >= 3) { k1 = 1; }
  var l1 = 0; if (rankw >= 3) { l1 = 1; }
  var i2 = 0; if (rankx >= 2) { i2 = 1; }
  var j2 = 0; if (ranky >= 2) { j2 = 1; }
  var k2 = 0; if (rankz >= 2) { k2 = 1; }
  var l2 = 0; if (rankw >= 2) { l2 = 1; }
  var i3 = 0; if (rankx >= 1) { i3 = 1; }
  var j3 = 0; if (ranky >= 1) { j3 = 1; }
  var k3 = 0; if (rankz >= 1) { k3 = 1; }
  var l3 = 0; if (rankw >= 1) { l3 = 1; }
  let d1 = d0 - vec4f(f32(i1), f32(j1), f32(k1), f32(l1)) + G4;
  let d2 = d0 - vec4f(f32(i2), f32(j2), f32(k2), f32(l2)) + 2.0 * G4;
  let d3 = d0 - vec4f(f32(i3), f32(j3), f32(k3), f32(l3)) + 3.0 * G4;
  let d4 = d0 - 1.0 + 4.0 * G4;
  return contrib4(d0, hash4u(i, j, k, l)) + contrib4(d1, hash4u(i + i1, j + j1, k + k1, l + l1)) +
    contrib4(d2, hash4u(i + i2, j + j2, k + k2, l + l2)) + contrib4(d3, hash4u(i + i3, j + j3, k + k3, l + l3)) +
    contrib4(d4, hash4u(i + 1, j + 1, k + 1, l + 1));
}
`
