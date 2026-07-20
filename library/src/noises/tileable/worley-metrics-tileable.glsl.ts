// GLSL counterpart of worley-metrics-tileable.ts. Requires COMMON_GLSL.

export const WORLEY_METRICS_TILEABLE_GLSL = /* glsl */ `
float manhattan2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      vec2 o = vec2(to01(h), to01(lowbias32(h)));
      vec2 v = abs(vec2(float(dx), float(dy)) + o - f);
      f1 = min(f1, v.x + v.y);
    }
  }
  return f1;
}

float manhattan3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        uint h2 = lowbias32(h);
        vec3 o = vec3(to01(h), to01(h2), to01(lowbias32(h2)));
        vec3 v = abs(vec3(float(dx), float(dy), float(dz)) + o - f);
        f1 = min(f1, v.x + v.y + v.z);
      }
    }
  }
  return f1;
}

float chebyshev2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      vec2 o = vec2(to01(h), to01(lowbias32(h)));
      vec2 v = abs(vec2(float(dx), float(dy)) + o - f);
      f1 = min(f1, max(v.x, v.y));
    }
  }
  return f1;
}

float chebyshev3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  int px = int(per.x);
  int py = int(per.y);
  float f1 = 1e9;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        uint h2 = lowbias32(h);
        vec3 o = vec3(to01(h), to01(h2), to01(lowbias32(h2)));
        vec3 v = abs(vec3(float(dx), float(dy), float(dz)) + o - f);
        f1 = min(f1, max(max(v.x, v.y), v.z));
      }
    }
  }
  return f1;
}
`
