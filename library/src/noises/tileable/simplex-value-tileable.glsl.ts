// GLSL counterpart of simplex-value-tileable.ts. Requires COMMON_GLSL.

export const SIMPLEX_VALUE_TILEABLE_GLSL = /* glsl */ `
float contribV4(vec4 d, uint h) {
  float t = 0.6 - dot(d, d);
  if (t <= 0.0) { return 0.0; }
  t *= t;
  return t * t * (to01(h) * 2.0 - 1.0);
}

float simplexValue4(vec4 p) {
  const float F4 = 0.30901699437494745;
  const float G4 = 0.1381966011250105;
  float s = (p.x + p.y + p.z + p.w) * F4;
  int i = int(floor(p.x + s));
  int j = int(floor(p.y + s));
  int k = int(floor(p.z + s));
  int l = int(floor(p.w + s));
  float t = float(i + j + k + l) * G4;
  vec4 d0 = p - (vec4(float(i), float(j), float(k), float(l)) - t);
  int rankx = 0; int ranky = 0; int rankz = 0; int rankw = 0;
  if (d0.x > d0.y) { rankx++; } else { ranky++; }
  if (d0.x > d0.z) { rankx++; } else { rankz++; }
  if (d0.x > d0.w) { rankx++; } else { rankw++; }
  if (d0.y > d0.z) { ranky++; } else { rankz++; }
  if (d0.y > d0.w) { ranky++; } else { rankw++; }
  if (d0.z > d0.w) { rankz++; } else { rankw++; }
  int i1 = rankx >= 3 ? 1 : 0;
  int j1 = ranky >= 3 ? 1 : 0;
  int k1 = rankz >= 3 ? 1 : 0;
  int l1 = rankw >= 3 ? 1 : 0;
  int i2 = rankx >= 2 ? 1 : 0;
  int j2 = ranky >= 2 ? 1 : 0;
  int k2 = rankz >= 2 ? 1 : 0;
  int l2 = rankw >= 2 ? 1 : 0;
  int i3 = rankx >= 1 ? 1 : 0;
  int j3 = ranky >= 1 ? 1 : 0;
  int k3 = rankz >= 1 ? 1 : 0;
  int l3 = rankw >= 1 ? 1 : 0;
  vec4 d1 = d0 - vec4(float(i1), float(j1), float(k1), float(l1)) + G4;
  vec4 d2 = d0 - vec4(float(i2), float(j2), float(k2), float(l2)) + 2.0 * G4;
  vec4 d3 = d0 - vec4(float(i3), float(j3), float(k3), float(l3)) + 3.0 * G4;
  vec4 d4 = d0 - 1.0 + 4.0 * G4;
  return contribV4(d0, hash4u(i, j, k, l)) + contribV4(d1, hash4u(i + i1, j + j1, k + k1, l + l1)) +
    contribV4(d2, hash4u(i + i2, j + j2, k + k2, l + l2)) + contribV4(d3, hash4u(i + i3, j + j3, k + k3, l + l3)) +
    contribV4(d4, hash4u(i + 1, j + 1, k + 1, l + 1));
}

float simplexValue2T(vec2 p, vec2 per) {
  const float TAU = 6.283185307179586;
  vec2 a = p / per * TAU;
  vec2 r = per / TAU;
  return simplexValue4(vec4(r.x * cos(a.x), r.x * sin(a.x), r.y * cos(a.y), r.y * sin(a.y)));
}
`
