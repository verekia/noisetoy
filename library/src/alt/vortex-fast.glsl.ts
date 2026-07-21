// GLSL counterpart of vortex-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. Sixteen directions as quadrant rotations of four base
// vectors; cos(2 * atan2) replaced by (sx^2 - sy^2) / (sx^2 + sy^2).

export const VORTEX_FAST_GLSL = /* glsl */ `
vec2 vtxFastDir(uint h) {
  uint t = (h >> 28u) & 3u;
  float bx = t == 0u ? 1.0 : t == 1u ? 0.9238795325112867 : t == 2u ? 0.7071067811865476 : 0.3826834323650898;
  float by = t == 0u ? 0.0 : t == 1u ? 0.3826834323650898 : t == 2u ? 0.7071067811865476 : 0.9238795325112867;
  uint q = h >> 30u;
  return q == 0u ? vec2(bx, by) : q == 1u ? vec2(-by, bx) : q == 2u ? vec2(-bx, -by) : vec2(by, -bx);
}

float vortexFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  uint x0 = uint(int(i.x)) * LATTICE_HX;
  uint y0 = uint(int(i.y)) * LATTICE_HY;
  uint x1 = x0 + LATTICE_HX;
  uint y1 = y0 + LATTICE_HY;
  uint rx0 = x0 ^ (x0 >> 16u);
  uint rx1 = x1 ^ (x1 >> 16u);
  vec2 s = (1.0 - ux) * (1.0 - uy) * vtxFastDir((rx0 ^ y0) * ALT_FIB);
  s += ux * (1.0 - uy) * vtxFastDir((rx1 ^ y0) * ALT_FIB);
  s += (1.0 - ux) * uy * vtxFastDir((rx0 ^ y1) * ALT_FIB);
  s += ux * uy * vtxFastDir((rx1 ^ y1) * ALT_FIB);
  float a = s.x * s.x;
  float b = s.y * s.y;
  float n = a + b;
  return n > 0.0 ? (a - b) / n : 1.0;
}

vec2 vtxFastCorner3(uint s) {
  uint h = lowbias32(s);
  return vtxFastDir(h) * (float((h >> 18u) & 1023u) * (1.0 / 1024.0));
}

float vortexFast3(vec3 p) {
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
  uint xy00 = x0 + y0;
  uint xy10 = x1 + y0;
  uint xy01 = x0 + y1;
  uint xy11 = x1 + y1;
  float vx = 1.0 - ux;
  float vy = 1.0 - uy;
  float vz = 1.0 - uz;
  vec2 s = vx * vy * vz * vtxFastCorner3(xy00 + z0);
  s += ux * vy * vz * vtxFastCorner3(xy10 + z0);
  s += vx * uy * vz * vtxFastCorner3(xy01 + z0);
  s += ux * uy * vz * vtxFastCorner3(xy11 + z0);
  s += vx * vy * uz * vtxFastCorner3(xy00 + z1);
  s += ux * vy * uz * vtxFastCorner3(xy10 + z1);
  s += vx * uy * uz * vtxFastCorner3(xy01 + z1);
  s += ux * uy * uz * vtxFastCorner3(xy11 + z1);
  float a = s.x * s.x;
  float b = s.y * s.y;
  float n = a + b;
  return n > 0.0 ? (a - b) / n : 1.0;
}
`
