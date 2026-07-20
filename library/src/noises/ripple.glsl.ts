// GLSL counterpart of ripple.ts. Requires COMMON_GLSL.

export const RIPPLE_GLSL = /* glsl */ `
float ripple2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float sum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      uint h = hash2u(ix + dx, iy + dy);
      uint h2 = lowbias32(h);
      vec2 o = vec2(to01(h), to01(h2));
      float ph = to01(lowbias32(h2)) * 6.283185307179586;
      vec2 v = vec2(float(dx), float(dy)) + o - f;
      float d = length(v);
      float w = max(0.0, 1.0 - d / 1.5);
      sum += w * w * cos(d * 15.0 - ph);
    }
  }
  return sum;
}

float ripple3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float sum = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        uint h = hash3u(ix + dx, iy + dy, iz + dz);
        uint h2 = lowbias32(h);
        uint h3 = lowbias32(h2);
        vec3 o = vec3(to01(h), to01(h2), to01(h3));
        float ph = to01(lowbias32(h3)) * 6.283185307179586;
        vec3 v = vec3(float(dx), float(dy), float(dz)) + o - f;
        float d = length(v);
        float w = max(0.0, 1.0 - d / 1.5);
        sum += w * w * cos(d * 15.0 - ph);
      }
    }
  }
  return sum;
}
`
