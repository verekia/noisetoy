// WGSL counterpart of simplex-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL.

export const SIMPLEX_FAST_WGSL = /* wgsl */ `
fn simplexFast2(p: vec2f) -> f32 {
  let F2 = 0.3660254037844386;
  let G2 = 0.21132486540518713;
  let s = (p.x + p.y) * F2;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let t = f32(i + j) * G2;
  let x0 = p.x - (f32(i) - t);
  let y0 = p.y - (f32(j) - t);
  let i1 = select(0, 1, x0 > y0);
  let x1 = x0 - f32(i1) + G2;
  let y1 = y0 - f32(1 - i1) + G2;
  let x2 = x0 - 1.0 + 2.0 * G2;
  let y2 = y0 - 1.0 + 2.0 * G2;
  let s0 = bitcast<u32>(i) * LATTICE_HX + bitcast<u32>(j) * LATTICE_HY;
  let s2 = s0 + LATTICE_HX + LATTICE_HY;
  let s1 = s0 + select(LATTICE_HY, LATTICE_HX, i1 == 1);
  var n = 0.0;
  var t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradFastDiag2(fibMix(s0), vec2f(x0, y0));
  }
  var t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0.0) {
    t1 *= t1;
    n += t1 * t1 * gradFastDiag2(fibMix(s1), vec2f(x1, y1));
  }
  var t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradFastDiag2(fibMix(s2), vec2f(x2, y2));
  }
  return n;
}

fn simplexFast3(p: vec3f) -> f32 {
  let F3 = 0.3333333333333333;
  let G3 = 0.16666666666666666;
  let s = (p.x + p.y + p.z) * F3;
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let t = f32(i + j + k) * G3;
  let x0 = p.x - (f32(i) - t);
  let y0 = p.y - (f32(j) - t);
  let z0 = p.z - (f32(k) - t);
  let a = select(0, 1, x0 >= y0);
  let b = select(0, 1, y0 >= z0);
  let c = select(0, 1, x0 >= z0);
  let na = 1 - a;
  let nb = 1 - b;
  let i1 = a & (b | c);
  let j1 = na & b;
  let k1 = nb & (na | (1 - c));
  let i2 = a | (b & c);
  let j2 = na | b;
  let k2 = nb | (na & (1 - c));
  let x1 = x0 - f32(i1) + G3;
  let y1 = y0 - f32(j1) + G3;
  let z1 = z0 - f32(k1) + G3;
  let x2 = x0 - f32(i2) + 2.0 * G3;
  let y2 = y0 - f32(j2) + 2.0 * G3;
  let z2 = z0 - f32(k2) + 2.0 * G3;
  let x3 = x0 - 1.0 + 3.0 * G3;
  let y3 = y0 - 1.0 + 3.0 * G3;
  let z3 = z0 - 1.0 + 3.0 * G3;
  let h0 = bitcast<u32>(i) * LATTICE_HX + bitcast<u32>(j) * LATTICE_HY + bitcast<u32>(k) * LATTICE_HZ;
  let h3 = h0 + LATTICE_HX + LATTICE_HY + LATTICE_HZ;
  let h1 = h0 + select(select(LATTICE_HZ, LATTICE_HY, j1 == 1), LATTICE_HX, i1 == 1);
  let h2 = h3 - select(select(LATTICE_HZ, LATTICE_HY, j2 == 0), LATTICE_HX, i2 == 0);
  var n = 0.0;
  var t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradFast3(lmfMix(h0), vec3f(x0, y0, z0));
  }
  var t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0.0) {
    t1 *= t1;
    n += t1 * t1 * gradFast3(lmfMix(h1), vec3f(x1, y1, z1));
  }
  var t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradFast3(lmfMix(h2), vec3f(x2, y2, z2));
  }
  var t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0.0) {
    t3 *= t3;
    n += t3 * t3 * gradFast3(lmfMix(h3), vec3f(x3, y3, z3));
  }
  return n;
}
`
