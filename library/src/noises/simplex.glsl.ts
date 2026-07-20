// GLSL counterpart of simplex.ts. Requires COMMON_GLSL.

export const SIMPLEX_GLSL = /* glsl */ `
float simplex2(vec2 p) {
  const float F2 = 0.3660254037844386;
  const float G2 = 0.21132486540518713;
  float s = (p.x + p.y) * F2;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  float t = float(i + j) * G2;
  float x0 = p.x - (float(i) - t);
  float y0 = p.y - (float(j) - t);
  int i1 = x0 > y0 ? 1 : 0;
  int j1 = 1 - i1;
  float x1 = x0 - float(i1) + G2;
  float y1 = y0 - float(j1) + G2;
  float x2 = x0 - 1.0 + 2.0 * G2;
  float y2 = y0 - 1.0 + 2.0 * G2;
  uint hx0 = uint(i) * LATTICE_HX;
  uint hy0 = uint(j) * LATTICE_HY;
  uint hx1 = hx0 + LATTICE_HX;
  uint hy1 = hy0 + LATTICE_HY;
  float n = 0.0;
  float t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradTable2(lowbias32(hx0 + hy0), vec2(x0, y0));
  }
  float t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0.0) {
    t1 *= t1;
    uint h = (i1 == 1 ? hx1 : hx0) + (j1 == 1 ? hy1 : hy0);
    n += t1 * t1 * gradTable2(lowbias32(h), vec2(x1, y1));
  }
  float t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradTable2(lowbias32(hx1 + hy1), vec2(x2, y2));
  }
  return n;
}

float simplex3(vec3 p) {
  const float F3 = 0.3333333333333333;
  const float G3 = 0.16666666666666666;
  float s = (p.x + p.y + p.z) * F3;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  int k = int(floor(p.z + s));
  float t = float(i + j + k) * G3;
  float x0 = p.x - (float(i) - t);
  float y0 = p.y - (float(j) - t);
  float z0 = p.z - (float(k) - t);
  int i1 = 0; int j1 = 0; int k1 = 0;
  int i2 = 0; int j2 = 0; int k2 = 0;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; i2 = 1; j2 = 1; }
    else if (x0 >= z0) { i1 = 1; i2 = 1; k2 = 1; }
    else { k1 = 1; i2 = 1; k2 = 1; }
  } else {
    if (y0 < z0) { k1 = 1; j2 = 1; k2 = 1; }
    else if (x0 < z0) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
  }
  float x1 = x0 - float(i1) + G3;
  float y1 = y0 - float(j1) + G3;
  float z1 = z0 - float(k1) + G3;
  float x2 = x0 - float(i2) + 2.0 * G3;
  float y2 = y0 - float(j2) + 2.0 * G3;
  float z2 = z0 - float(k2) + 2.0 * G3;
  float x3 = x0 - 1.0 + 3.0 * G3;
  float y3 = y0 - 1.0 + 3.0 * G3;
  float z3 = z0 - 1.0 + 3.0 * G3;
  uint hx0 = uint(i) * LATTICE_HX;
  uint hy0 = uint(j) * LATTICE_HY;
  uint hz0 = uint(k) * LATTICE_HZ;
  uint hx1 = hx0 + LATTICE_HX;
  uint hy1 = hy0 + LATTICE_HY;
  uint hz1 = hz0 + LATTICE_HZ;
  float n = 0.0;
  float t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradTable3(lowbias32(hx0 + hy0 + hz0), vec3(x0, y0, z0));
  }
  float t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0.0) {
    t1 *= t1;
    uint h1 = (i1 == 1 ? hx1 : hx0) + (j1 == 1 ? hy1 : hy0) + (k1 == 1 ? hz1 : hz0);
    n += t1 * t1 * gradTable3(lowbias32(h1), vec3(x1, y1, z1));
  }
  float t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0.0) {
    t2 *= t2;
    uint h2 = (i2 == 1 ? hx1 : hx0) + (j2 == 1 ? hy1 : hy0) + (k2 == 1 ? hz1 : hz0);
    n += t2 * t2 * gradTable3(lowbias32(h2), vec3(x2, y2, z2));
  }
  float t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0.0) {
    t3 *= t3;
    n += t3 * t3 * gradTable3(lowbias32(hx1 + hy1 + hz1), vec3(x3, y3, z3));
  }
  return n;
}
`
