// GLSL counterpart of simplex-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL.

export const SIMPLEX_FAST_GLSL = /* glsl */ `
float simplexFast2(vec2 p) {
  const float F2 = 0.3660254037844386;
  const float G2 = 0.21132486540518713;
  float s = (p.x + p.y) * F2;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  float t = float(i + j) * G2;
  float x0 = p.x - (float(i) - t);
  float y0 = p.y - (float(j) - t);
  int i1 = x0 > y0 ? 1 : 0;
  float x1 = x0 - float(i1) + G2;
  float y1 = y0 - float(1 - i1) + G2;
  float x2 = x0 - 1.0 + 2.0 * G2;
  float y2 = y0 - 1.0 + 2.0 * G2;
  uint s0 = uint(i) * LATTICE_HX + uint(j) * LATTICE_HY;
  uint s2 = s0 + LATTICE_HX + LATTICE_HY;
  uint s1 = s0 + (i1 == 1 ? LATTICE_HX : LATTICE_HY);
  float n = 0.0;
  float t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradFastDiag2(fibMix(s0), vec2(x0, y0));
  }
  float t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0.0) {
    t1 *= t1;
    n += t1 * t1 * gradFastDiag2(fibMix(s1), vec2(x1, y1));
  }
  float t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradFastDiag2(fibMix(s2), vec2(x2, y2));
  }
  return n;
}

float simplexFast3(vec3 p) {
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
  int a = x0 >= y0 ? 1 : 0;
  int b = y0 >= z0 ? 1 : 0;
  int c = x0 >= z0 ? 1 : 0;
  int na = 1 - a;
  int nb = 1 - b;
  int i1 = a & (b | c);
  int j1 = na & b;
  int k1 = nb & (na | (1 - c));
  int i2 = a | (b & c);
  int j2 = na | b;
  int k2 = nb | (na & (1 - c));
  float x1 = x0 - float(i1) + G3;
  float y1 = y0 - float(j1) + G3;
  float z1 = z0 - float(k1) + G3;
  float x2 = x0 - float(i2) + 2.0 * G3;
  float y2 = y0 - float(j2) + 2.0 * G3;
  float z2 = z0 - float(k2) + 2.0 * G3;
  float x3 = x0 - 1.0 + 3.0 * G3;
  float y3 = y0 - 1.0 + 3.0 * G3;
  float z3 = z0 - 1.0 + 3.0 * G3;
  uint h0 = uint(i) * LATTICE_HX + uint(j) * LATTICE_HY + uint(k) * LATTICE_HZ;
  uint h3 = h0 + LATTICE_HX + LATTICE_HY + LATTICE_HZ;
  uint h1 = h0 + (i1 == 1 ? LATTICE_HX : (j1 == 1 ? LATTICE_HY : LATTICE_HZ));
  uint h2 = h3 - (i2 == 0 ? LATTICE_HX : (j2 == 0 ? LATTICE_HY : LATTICE_HZ));
  float n = 0.0;
  float t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0.0) {
    t0 *= t0;
    n += t0 * t0 * gradFast3(lmfMix(h0), vec3(x0, y0, z0));
  }
  float t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0.0) {
    t1 *= t1;
    n += t1 * t1 * gradFast3(lmfMix(h1), vec3(x1, y1, z1));
  }
  float t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0.0) {
    t2 *= t2;
    n += t2 * t2 * gradFast3(lmfMix(h2), vec3(x2, y2, z2));
  }
  float t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0.0) {
    t3 *= t3;
    n += t3 * t3 * gradFast3(lmfMix(h3), vec3(x3, y3, z3));
  }
  return n;
}
`
