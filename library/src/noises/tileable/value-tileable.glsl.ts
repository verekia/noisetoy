// GLSL counterpart of value-tileable.ts. Requires COMMON_GLSL.

export const VALUE_TILEABLE_GLSL = /* glsl */ `
float value2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  int px = int(per.x);
  int py = int(per.y);
  int x0 = imod(int(i.x), px);
  int x1 = imod(int(i.x) + 1, px);
  int y0 = imod(int(i.y), py);
  int y1 = imod(int(i.y) + 1, py);
  float n00 = to01(hash2u(x0, y0));
  float n10 = to01(hash2u(x1, y0));
  float n01 = to01(hash2u(x0, y1));
  float n11 = to01(hash2u(x1, y1));
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

float value3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  int px = int(per.x);
  int py = int(per.y);
  int x0 = imod(int(i.x), px);
  int x1 = imod(int(i.x) + 1, px);
  int y0 = imod(int(i.y), py);
  int y1 = imod(int(i.y) + 1, py);
  int iz = int(i.z);
  float n000 = to01(hash3u(x0, y0, iz));
  float n100 = to01(hash3u(x1, y0, iz));
  float n010 = to01(hash3u(x0, y1, iz));
  float n110 = to01(hash3u(x1, y1, iz));
  float n001 = to01(hash3u(x0, y0, iz + 1));
  float n101 = to01(hash3u(x1, y0, iz + 1));
  float n011 = to01(hash3u(x0, y1, iz + 1));
  float n111 = to01(hash3u(x1, y1, iz + 1));
  float nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  float nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
