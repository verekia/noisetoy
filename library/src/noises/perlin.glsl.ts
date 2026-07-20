// GLSL counterpart of perlin.ts. Requires COMMON_GLSL.

export const PERLIN_GLSL = /* glsl */ `
float perlin2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  float g00 = gradTable2(lowbias32(x0 + y0), f);
  float g10 = gradTable2(lowbias32(x1 + y0), f - vec2(1.0, 0.0));
  float g01 = gradTable2(lowbias32(x0 + y1), f - vec2(0.0, 1.0));
  float g11 = gradTable2(lowbias32(x1 + y1), f - vec2(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}

float perlin3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint z0 = uint(int(i.z)) * LATTICE_HZ;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  uint z1 = z0 + LATTICE_HZ;
  float g000 = gradTable3(lowbias32(x0 + y0 + z0), f);
  float g100 = gradTable3(lowbias32(x1 + y0 + z0), f - vec3(1.0, 0.0, 0.0));
  float g010 = gradTable3(lowbias32(x0 + y1 + z0), f - vec3(0.0, 1.0, 0.0));
  float g110 = gradTable3(lowbias32(x1 + y1 + z0), f - vec3(1.0, 1.0, 0.0));
  float g001 = gradTable3(lowbias32(x0 + y0 + z1), f - vec3(0.0, 0.0, 1.0));
  float g101 = gradTable3(lowbias32(x1 + y0 + z1), f - vec3(1.0, 0.0, 1.0));
  float g011 = gradTable3(lowbias32(x0 + y1 + z1), f - vec3(0.0, 1.0, 1.0));
  float g111 = gradTable3(lowbias32(x1 + y1 + z1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  float nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
