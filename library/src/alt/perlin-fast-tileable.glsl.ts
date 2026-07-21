// GLSL counterpart of perlin-fast-tileable.ts. Requires COMMON_GLSL (imod,
// LATTICE constants) and FAST_COMMON_GLSL (lmfMix, gradFast3).

export const PERLIN_FAST_TILEABLE_GLSL = /* glsl */ `
float perlinFast3T(vec3 p, vec2 per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float uz = fade(f.z);
  int px = int(per.x);
  int py = int(per.y);
  uint x0 = uint(imod(int(i.x), px)) * LATTICE_HX;
  uint x1 = uint(imod(int(i.x) + 1, px)) * LATTICE_HX;
  uint y0 = uint(imod(int(i.y), py)) * LATTICE_HY;
  uint y1 = uint(imod(int(i.y) + 1, py)) * LATTICE_HY;
  uint z0 = uint(int(i.z)) * LATTICE_HZ;
  uint z1 = z0 + LATTICE_HZ;
  float g000 = gradFast3(lmfMix(x0 + y0 + z0), f);
  float g100 = gradFast3(lmfMix(x1 + y0 + z0), f - vec3(1.0, 0.0, 0.0));
  float g010 = gradFast3(lmfMix(x0 + y1 + z0), f - vec3(0.0, 1.0, 0.0));
  float g110 = gradFast3(lmfMix(x1 + y1 + z0), f - vec3(1.0, 1.0, 0.0));
  float g001 = gradFast3(lmfMix(x0 + y0 + z1), f - vec3(0.0, 0.0, 1.0));
  float g101 = gradFast3(lmfMix(x1 + y0 + z1), f - vec3(1.0, 0.0, 1.0));
  float g011 = gradFast3(lmfMix(x0 + y1 + z1), f - vec3(0.0, 1.0, 1.0));
  float g111 = gradFast3(lmfMix(x1 + y1 + z1), f - vec3(1.0, 1.0, 1.0));
  float nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy);
  float nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy);
  return mix(nz0, nz1, uz);
}
`
