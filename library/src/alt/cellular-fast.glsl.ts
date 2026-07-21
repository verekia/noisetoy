// GLSL counterpart of cellular-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. Winner tracking uses inout parameters; shader compilers
// inline helpers unconditionally, so the TS file's longhand caution does not
// apply here.

export const CELLULAR_FAST_GLSL = /* glsl */ `
float mosFastCell2(uint s, vec2 b, float f1, inout uint sb) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  vec2 v = b + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
  float d = dot(v, v);
  if (d < f1) {
    sb = s;
    return d;
  }
  return f1;
}

float mosFastCell3(uint s, vec3 b, float f1, inout uint sb) {
  uint h = lowbias32(s);
  vec3 v = b + vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  float d = dot(v, v);
  if (d < f1) {
    sb = s;
    return d;
  }
  return f1;
}

float mosaicFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  uint sb = 0u;
  float f1 = mosFastCell2(xc + yc, vec2(-f.x, -f.y), 1e9, sb);
  f1 = mosFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), f1, sb);
  f1 = mosFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), f1, sb);
  if (f.x * f.x < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = mosFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), f1, sb);
    f1 = mosFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), f1, sb);
    f1 = mosFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), f1, sb);
  }
  float gx = 1.0 - f.x;
  if (gx * gx < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = mosFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), f1, sb);
    f1 = mosFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), f1, sb);
    f1 = mosFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), f1, sb);
  }
  return to01(lowbias32(sb));
}

float mosFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zz, float f1in, inout uint sb) {
  float f1 = f1in;
  f1 = mosFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), f1, sb);
  f1 = mosFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), f1, sb);
  f1 = mosFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), f1, sb);
  if (fxy.x * fxy.x + zz < f1) {
    uint xm = xc - LATTICE_HX;
    f1 = mosFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1, sb);
  }
  float gx = 1.0 - fxy.x;
  if (gx * gx + zz < f1) {
    uint xp = xc + LATTICE_HX;
    f1 = mosFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), f1, sb);
  }
  return f1;
}

float mosaicFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  uint sb = 0u;
  float f1 = mosFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9, sb);
  float zzm = f.z * f.z;
  if (zzm < f1) {
    uint zm = zc - LATTICE_HZ;
    f1 = mosFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, f1, sb);
  }
  float gz = 1.0 - f.z;
  float zzp = gz * gz;
  if (zzp < f1) {
    uint zp = zc + LATTICE_HZ;
    f1 = mosFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, f1, sb);
  }
  return to01(lowbias32(sb));
}
`
