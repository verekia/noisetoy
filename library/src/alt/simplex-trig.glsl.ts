// GLSL counterpart of simplex.ts. Requires COMMON_GLSL.

export const SIMPLEX_TRIG_GLSL = /* glsl */ `
float trigContrib2(vec2 d, uint h) {
  float t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * gradDot2(h, d);
}

float trigContrib3(vec3 d, uint h) {
  float t = 0.5 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * gradDot3(h, d);
}

float simplexTrig2(vec2 p) {
  const float F2 = 0.3660254037844386;
  const float G2 = 0.21132486540518713;
  float s = (p.x + p.y) * F2;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  float t = float(i + j) * G2;
  vec2 d0 = p - (vec2(float(i), float(j)) - t);
  int i1 = d0.x > d0.y ? 1 : 0;
  int j1 = 1 - i1;
  vec2 d1 = d0 - vec2(float(i1), float(j1)) + G2;
  vec2 d2 = d0 - 1.0 + 2.0 * G2;
  return trigContrib2(d0, hash2u(i, j)) + trigContrib2(d1, hash2u(i + i1, j + j1)) + trigContrib2(d2, hash2u(i + 1, j + 1));
}

float simplexTrig3(vec3 p) {
  const float F3 = 1.0 / 3.0;
  const float G3 = 1.0 / 6.0;
  float s = (p.x + p.y + p.z) * F3;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  int k = int(floor(p.z + s));
  float t = float(i + j + k) * G3;
  vec3 d0 = p - (vec3(float(i), float(j), float(k)) - t);
  int i1 = 0; int j1 = 0; int k1 = 0;
  int i2 = 0; int j2 = 0; int k2 = 0;
  if (d0.x >= d0.y) {
    if (d0.y >= d0.z) { i1 = 1; i2 = 1; j2 = 1; }
    else if (d0.x >= d0.z) { i1 = 1; i2 = 1; k2 = 1; }
    else { k1 = 1; i2 = 1; k2 = 1; }
  } else {
    if (d0.y < d0.z) { k1 = 1; j2 = 1; k2 = 1; }
    else if (d0.x < d0.z) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
  }
  vec3 d1 = d0 - vec3(float(i1), float(j1), float(k1)) + G3;
  vec3 d2 = d0 - vec3(float(i2), float(j2), float(k2)) + 2.0 * G3;
  vec3 d3 = d0 - 1.0 + 3.0 * G3;
  return trigContrib3(d0, hash3u(i, j, k)) + trigContrib3(d1, hash3u(i + i1, j + j1, k + k1)) +
    trigContrib3(d2, hash3u(i + i2, j + j2, k + k2)) + trigContrib3(d3, hash3u(i + 1, j + 1, k + 1));
}
`
