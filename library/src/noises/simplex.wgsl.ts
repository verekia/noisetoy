// WGSL counterpart of simplex.ts. Requires COMMON_WGSL.

export const SIMPLEX_WGSL = /* wgsl */ `
fn simplex2(p: vec2f) -> f32 {
  const F2 = 0.3660254037844386;
  const G2 = 0.21132486540518713;
  let s = (p.x + p.y) * F2;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let t = f32(i + j) * G2;
  let x0 = p.x - (f32(i) - t);
  let y0 = p.y - (f32(j) - t);
  let i1 = select(0, 1, x0 > y0);
  let j1 = 1 - i1;
  let x1 = x0 - f32(i1) + G2;
  let y1 = y0 - f32(j1) + G2;
  let x2 = x0 - 1.0 + 2.0 * G2;
  let y2 = y0 - 1.0 + 2.0 * G2;
  let hx0 = bitcast<u32>(i) * LATTICE_HX;
  let hy0 = bitcast<u32>(j) * LATTICE_HY;
  let hx1 = hx0 + LATTICE_HX;
  let hy1 = hy0 + LATTICE_HY;
  var n = 0.0;
  var t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradTable2(lowbias32(hx0 + hy0), vec2f(x0, y0));
  }
  var t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0.0) {
    t1 *= t1;
    let h = select(hx0, hx1, i1 == 1) + select(hy0, hy1, j1 == 1);
    n += t1 * t1 * gradTable2(lowbias32(h), vec2f(x1, y1));
  }
  var t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradTable2(lowbias32(hx1 + hy1), vec2f(x2, y2));
  }
  return n;
}

fn simplex3(p: vec3f) -> f32 {
  const F3 = 0.3333333333333333;
  const G3 = 0.16666666666666666;
  let s = (p.x + p.y + p.z) * F3;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let t = f32(i + j + k) * G3;
  let x0 = p.x - (f32(i) - t);
  let y0 = p.y - (f32(j) - t);
  let z0 = p.z - (f32(k) - t);
  var i1 = 0; var j1 = 0; var k1 = 0;
  var i2 = 0; var j2 = 0; var k2 = 0;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; i2 = 1; j2 = 1; }
    else if (x0 >= z0) { i1 = 1; i2 = 1; k2 = 1; }
    else { k1 = 1; i2 = 1; k2 = 1; }
  } else {
    if (y0 < z0) { k1 = 1; j2 = 1; k2 = 1; }
    else if (x0 < z0) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
  }
  let x1 = x0 - f32(i1) + G3;
  let y1 = y0 - f32(j1) + G3;
  let z1 = z0 - f32(k1) + G3;
  let x2 = x0 - f32(i2) + 2.0 * G3;
  let y2 = y0 - f32(j2) + 2.0 * G3;
  let z2 = z0 - f32(k2) + 2.0 * G3;
  let x3 = x0 - 1.0 + 3.0 * G3;
  let y3 = y0 - 1.0 + 3.0 * G3;
  let z3 = z0 - 1.0 + 3.0 * G3;
  let hx0 = bitcast<u32>(i) * LATTICE_HX;
  let hy0 = bitcast<u32>(j) * LATTICE_HY;
  let hz0 = bitcast<u32>(k) * LATTICE_HZ;
  let hx1 = hx0 + LATTICE_HX;
  let hy1 = hy0 + LATTICE_HY;
  let hz1 = hz0 + LATTICE_HZ;
  var n = 0.0;
  var t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradTable3(lowbias32(hx0 + hy0 + hz0), vec3f(x0, y0, z0));
  }
  var t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0.0) {
    t1 *= t1;
    let h1 = select(hx0, hx1, i1 == 1) + select(hy0, hy1, j1 == 1) + select(hz0, hz1, k1 == 1);
    n += t1 * t1 * gradTable3(lowbias32(h1), vec3f(x1, y1, z1));
  }
  var t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0.0) {
    t2 *= t2;
    let h2 = select(hx0, hx1, i2 == 1) + select(hy0, hy1, j2 == 1) + select(hz0, hz1, k2 == 1);
    n += t2 * t2 * gradTable3(lowbias32(h2), vec3f(x2, y2, z2));
  }
  var t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0.0) {
    t3 *= t3;
    n += t3 * t3 * gradTable3(lowbias32(hx1 + hy1 + hz1), vec3f(x3, y3, z3));
  }
  return n;
}
`
