// GLSL counterpart of vortex.ts. Requires COMMON_GLSL.

export const VORTEX_GLSL = /* glsl */ `
float vortex2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  vec2 s = vec2(0.0);
  for (int cy = 0; cy <= 1; cy++) {
    for (int cx = 0; cx <= 1; cx++) {
      float a = to01(hash2u(ix + cx, iy + cy)) * 6.283185307179586;
      float w = (cx == 0 ? 1.0 - ux : ux) * (cy == 0 ? 1.0 - uy : uy);
      s += w * vec2(cos(a), sin(a));
    }
  }
  return cos(2.0 * atan(s.y, s.x));
}

float vortex3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  vec2 s = vec2(0.0);
  for (int cz = 0; cz <= 1; cz++) {
    for (int cy = 0; cy <= 1; cy++) {
      for (int cx = 0; cx <= 1; cx++) {
        uint h = hash3u(ix + cx, iy + cy, iz + cz);
        float kz = to01(h) * 2.0 - 1.0;
        float a = to01(lowbias32(h)) * 6.283185307179586;
        float r = sqrt(max(0.0, 1.0 - kz * kz));
        float w = (cx == 0 ? 1.0 - ux : ux) * (cy == 0 ? 1.0 - uy : uy) * (cz == 0 ? 1.0 - uz : uz);
        s += w * r * vec2(cos(a), sin(a));
      }
    }
  }
  return cos(2.0 * atan(s.y, s.x));
}
`
