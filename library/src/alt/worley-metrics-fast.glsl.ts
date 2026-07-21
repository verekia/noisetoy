// GLSL counterpart of worley-metrics-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. Plane helpers are fine on GPU (shader compilers inline
// unconditionally); the L1 plane bound ADDS the axis clearances, the Linf
// bound takes their MAX.

export const WORLEY_METRICS_FAST_GLSL = /* glsl */ `
vec2 wmFastOffsets2(uint s) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  return vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
}

vec3 wmFastOffsets3(uint s) {
  uint h = lowbias32(s);
  return vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
}

float mFastCell2(uint s, vec2 b, float f1) {
  vec2 v = abs(b + wmFastOffsets2(s));
  return min(f1, v.x + v.y);
}

float cFastCell2(uint s, vec2 b, float f1) {
  vec2 v = abs(b + wmFastOffsets2(s));
  return min(f1, max(v.x, v.y));
}

float manhattanFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = mFastCell2(xc + yc, vec2(-f.x, -f.y), 1e9);
  f1 = mFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), f1);
  f1 = mFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), f1);
  if (f.x < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = mFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), f1);
    f1 = mFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = mFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), f1);
  }
  if (1.0 - f.x < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = mFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), f1);
    f1 = mFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), f1);
    f1 = mFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), f1);
  }
  return f1;
}

float chebyshevFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = cFastCell2(xc + yc, vec2(-f.x, -f.y), 1e9);
  f1 = cFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), f1);
  f1 = cFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), f1);
  if (f.x < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = cFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), f1);
    f1 = cFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = cFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), f1);
  }
  if (1.0 - f.x < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = cFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), f1);
    f1 = cFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), f1);
    f1 = cFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), f1);
  }
  return f1;
}

float mFastCell3(uint s, vec3 b, float f1) {
  vec3 v = abs(b + wmFastOffsets3(s));
  return min(f1, v.x + v.y + v.z);
}

float cFastCell3(uint s, vec3 b, float f1) {
  vec3 v = abs(b + wmFastOffsets3(s));
  return min(f1, max(v.x, max(v.y, v.z)));
}

float mFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zclear, float f1in) {
  float f1 = f1in;
  f1 = mFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), f1);
  f1 = mFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = mFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (fxy.x + zclear < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = mFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = mFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = mFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  if (1.0 - fxy.x + zclear < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = mFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = mFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = mFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

float cFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zclear, float f1in) {
  float f1 = f1in;
  f1 = cFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), f1);
  f1 = cFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = cFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (max(fxy.x, zclear) < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = cFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = cFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = cFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  if (max(1.0 - fxy.x, zclear) < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = cFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = cFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = cFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

float manhattanFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = mFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  if (f.z < f1) {
    uint zm = zc - LATTICE_HZ;
    f1 = mFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, f.z, f1);
  }
  if (1.0 - f.z < f1) {
    uint zp = zc + LATTICE_HZ;
    f1 = mFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, 1.0 - f.z, f1);
  }
  return f1;
}

float chebyshevFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float f1 = cFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  if (f.z < f1) {
    uint zm = zc - LATTICE_HZ;
    f1 = cFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, f.z, f1);
  }
  if (1.0 - f.z < f1) {
    uint zp = zc + LATTICE_HZ;
    f1 = cFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, 1.0 - f.z, f1);
  }
  return f1;
}
`
