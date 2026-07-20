// GLSL ES 3.00 counterpart of common.ts. Kept line-for-line comparable.
//
// lowbias32 by Chris Wellons (public domain): https://nullprogram.com/blog/2018/07/31/
//
// Note: GLSL ES 3.00 leaves `%` undefined for negative ints, so imod goes
// through float mod(), which is defined for negatives and exact for the small
// lattice integers we use.

export const COMMON_GLSL = /* glsl */ `
uint lowbias32(uint x0) {
  uint x = x0;
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

uint hash2u(int x, int y) { return lowbias32(uint(x) ^ lowbias32(uint(y))); }

uint hash3u(int x, int y, int z) { return lowbias32(uint(x) ^ lowbias32(uint(y) ^ lowbias32(uint(z)))); }

uint hash4u(int x, int y, int z, int w) {
  return lowbias32(uint(x) ^ lowbias32(uint(y) ^ lowbias32(uint(z) ^ lowbias32(uint(w)))));
}

float to01(uint h) { return float(h) * (1.0 / 4294967296.0); }

float fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

int imod(int a, int b) { return int(mod(float(a), float(b))); }

const uint LATTICE_HX = 0x27d4eb2fu;
const uint LATTICE_HY = 0x85ebca6bu;
const uint LATTICE_HZ = 0xc2b2ae35u;

float gradTable2(uint h, vec2 d) {
  uint hi = h & 7u;
  float u = hi < 4u ? d.x : d.y;
  float v = hi < 4u ? d.y : d.x;
  return ((hi & 1u) == 0u ? u : -u) + ((hi & 2u) == 0u ? v : -v);
}

float gradTable3(uint h, vec3 d) {
  uint t = h >> 2u;
  int axis = t < 357913941u ? 0 : (t < 715827882u ? 1 : 2);
  float a = axis == 2 ? d.y : d.x;
  float b = axis == 0 ? d.y : d.z;
  return ((h & 1u) == 0u ? a : -a) + ((h & 2u) == 0u ? b : -b);
}

float gradDot2(uint h, vec2 d) {
  float a = to01(h) * 6.283185307179586;
  return dot(vec2(cos(a), sin(a)), d);
}

float gradDot3(uint h, vec3 d) {
  float gz = to01(h) * 2.0 - 1.0;
  float a = to01(lowbias32(h)) * 6.283185307179586;
  float r = sqrt(max(0.0, 1.0 - gz * gz));
  return dot(vec3(r * cos(a), r * sin(a), gz), d);
}
`
