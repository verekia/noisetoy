// GLSL counterpart of the corner mixes and gradient selectors shared by the
// fast candidate implementations (alt/perlin-fast.ts, alt/worley-fast.ts,
// alt/simplex-fast.ts). Requires COMMON_GLSL (LATTICE constants, lowbias32).
//
// Every selection bit is read from the TOP of the mix output; see the TS
// files for the statistics behind which mix each dimension needs.

export const FAST_COMMON_GLSL = /* glsl */ `
const uint ALT_FIB = 0x9e3779b1u;

uint fibMix(uint s) {
  return (s ^ (s >> 16u)) * ALT_FIB;
}

uint lmfMix(uint s0) {
  uint s = s0 ^ (s0 >> 16u);
  s *= 0x7feb352du;
  s ^= s >> 15u;
  s *= 0x846ca68bu;
  return s;
}

float pickSD(uint h, float sv, float dv) {
  float v = (h & 0x40000000u) == 0u ? sv : dv;
  return h >= 0x80000000u ? -v : v;
}

float gradFastDiag2(uint h, vec2 d) {
  return (h >= 0x80000000u ? -d.x : d.x) + ((h & 0x40000000u) == 0u ? d.y : -d.y);
}

float gradFast3(uint h, vec3 d) {
  uint t = h & 0x3fffffffu;
  float a = t < 715827882u ? d.x : d.y;
  float b = t < 357913941u ? d.y : d.z;
  return ((h & 0x40000000u) == 0u ? a : -a) + (h >= 0x80000000u ? -b : b);
}
`
