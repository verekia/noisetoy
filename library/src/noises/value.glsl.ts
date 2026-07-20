// GLSL counterpart of value.ts. Requires COMMON_GLSL.

export const VALUE_GLSL = /* glsl */ `
float value2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float n00 = to01(hash2u(ix, iy));
  float n10 = to01(hash2u(ix + 1, iy));
  float n01 = to01(hash2u(ix, iy + 1));
  float n11 = to01(hash2u(ix + 1, iy + 1));
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}

float value3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  int ix = int(i.x);
  int iy = int(i.y);
  int iz = int(i.z);
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  float n000 = to01(hash3u(ix, iy, iz));
  float n100 = to01(hash3u(ix + 1, iy, iz));
  float n010 = to01(hash3u(ix, iy + 1, iz));
  float n110 = to01(hash3u(ix + 1, iy + 1, iz));
  float n001 = to01(hash3u(ix, iy, iz + 1));
  float n101 = to01(hash3u(ix + 1, iy, iz + 1));
  float n011 = to01(hash3u(ix, iy + 1, iz + 1));
  float n111 = to01(hash3u(ix + 1, iy + 1, iz + 1));
  float nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy);
  float nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
