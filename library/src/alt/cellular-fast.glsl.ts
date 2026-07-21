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
vec2 crkFastCell2(uint s, vec2 b, vec2 ff) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  vec2 v = b + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
  float d = dot(v, v);
  if (d < ff.x) return vec2(d, ff.x);
  if (d < ff.y) return vec2(ff.x, d);
  return ff;
}

vec2 crkFastCell3(uint s, vec3 b, vec2 ff) {
  uint h = lowbias32(s);
  vec3 v = b + vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  float d = dot(v, v);
  if (d < ff.x) return vec2(d, ff.x);
  if (d < ff.y) return vec2(ff.x, d);
  return ff;
}

float crackleFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  vec2 ff = crkFastCell2(xc + yc, vec2(-f.x, -f.y), vec2(1e9, 1e9));
  ff = crkFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), ff);
  ff = crkFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), ff);
  if (f.x * f.x < ff.y) {
    uint xm = xc - LATTICE_HX;
    ff = crkFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), ff);
    ff = crkFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), ff);
    ff = crkFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), ff);
  }
  float gx = 1.0 - f.x;
  if (gx * gx < ff.y) {
    uint xp = xc + LATTICE_HX;
    ff = crkFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), ff);
    ff = crkFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), ff);
    ff = crkFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), ff);
  }
  return sqrt(ff.y) - sqrt(ff.x);
}

vec2 crkFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zz, vec2 ffin) {
  vec2 ff = ffin;
  ff = crkFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), ff);
  ff = crkFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), ff);
  ff = crkFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), ff);
  if (fxy.x * fxy.x + zz < ff.y) {
    uint xm = xc - LATTICE_HX;
    ff = crkFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), ff);
    ff = crkFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), ff);
    ff = crkFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), ff);
  }
  float gx = 1.0 - fxy.x;
  if (gx * gx + zz < ff.y) {
    uint xp = xc + LATTICE_HX;
    ff = crkFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), ff);
    ff = crkFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), ff);
    ff = crkFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), ff);
  }
  return ff;
}

float crackleFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  vec2 ff = crkFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, vec2(1e9, 1e9));
  float zzm = f.z * f.z;
  if (zzm < ff.y) {
    uint zm = zc - LATTICE_HZ;
    ff = crkFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, ff);
  }
  float gz = 1.0 - f.z;
  float zzp = gz * gz;
  if (zzp < ff.y) {
    uint zp = zc + LATTICE_HZ;
    ff = crkFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, ff);
  }
  return sqrt(ff.y) - sqrt(ff.x);
}
float foamFastCell2(uint s, vec2 b, float q) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  vec2 v = b + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
  return max(q, 1.21 - dot(v, v));
}

float foamFastCell3(uint s, vec3 b, float q) {
  uint h = lowbias32(s);
  vec3 v = b + vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  return max(q, 1.21 - dot(v, v));
}

float foamFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float q = foamFastCell2(xc + yc, vec2(-f.x, -f.y), 0.0);
  q = foamFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), q);
  q = foamFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), q);
  if (f.x * f.x < 1.21 - q) {
    uint xm = xc - LATTICE_HX;
    q = foamFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), q);
    q = foamFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), q);
    q = foamFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), q);
  }
  float gx = 1.0 - f.x;
  if (gx * gx < 1.21 - q) {
    uint xp = xc + LATTICE_HX;
    q = foamFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), q);
    q = foamFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), q);
    q = foamFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), q);
  }
  return q > 0.0 ? sqrt(q) * (1.0 / 1.1) : 0.0;
}

float foamFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zz, float qin) {
  float q = qin;
  q = foamFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), q);
  q = foamFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), q);
  q = foamFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), q);
  if (fxy.x * fxy.x + zz < 1.21 - q) {
    uint xm = xc - LATTICE_HX;
    q = foamFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), q);
    q = foamFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), q);
    q = foamFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), q);
  }
  float gx = 1.0 - fxy.x;
  if (gx * gx + zz < 1.21 - q) {
    uint xp = xc + LATTICE_HX;
    q = foamFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), q);
    q = foamFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), q);
    q = foamFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), q);
  }
  return q;
}

float foamFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float q = foamFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 0.0);
  float zzm = f.z * f.z;
  if (zzm < 1.21 - q) {
    uint zm = zc - LATTICE_HZ;
    q = foamFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, q);
  }
  float gz = 1.0 - f.z;
  float zzp = gz * gz;
  if (zzp < 1.21 - q) {
    uint zp = zc + LATTICE_HZ;
    q = foamFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, q);
  }
  return q > 0.0 ? sqrt(q) * (1.0 / 1.1) : 0.0;
}
float strFastCell2(uint s, vec2 b, float sum) {
  uint h = fibMix(s);
  h ^= h >> 16u;
  vec2 v = b + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0);
  float d2 = dot(v, v);
  if (d2 < 0.77) {
    uint bh = (h ^ (h >> 15u)) * ALT_FIB;
    return sum + float(bh >> 8u) * (1.0 / 16777216.0) * exp(-d2 * 18.0);
  }
  return sum;
}

float strFastCell3(uint s, vec3 b, float sum) {
  uint h = lowbias32(s);
  vec3 v = b + vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  float d2 = dot(v, v);
  if (d2 < 0.77) {
    uint bh = (h ^ (h >> 15u)) * ALT_FIB;
    return sum + float(bh >> 8u) * (1.0 / 16777216.0) * exp(-d2 * 18.0);
  }
  return sum;
}

float starsFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float sum = strFastCell2(xc + yc, vec2(-f.x, -f.y), 0.0);
  sum = strFastCell2(xc + ym, vec2(-f.x, -1.0 - f.y), sum);
  sum = strFastCell2(xc + yp, vec2(-f.x, 1.0 - f.y), sum);
  if (f.x * f.x < 0.77) {
    uint xm = xc - LATTICE_HX;
    sum = strFastCell2(xm + yc, vec2(-1.0 - f.x, -f.y), sum);
    sum = strFastCell2(xm + ym, vec2(-1.0 - f.x, -1.0 - f.y), sum);
    sum = strFastCell2(xm + yp, vec2(-1.0 - f.x, 1.0 - f.y), sum);
  }
  float gx = 1.0 - f.x;
  if (gx * gx < 0.77) {
    uint xp = xc + LATTICE_HX;
    sum = strFastCell2(xp + yc, vec2(1.0 - f.x, -f.y), sum);
    sum = strFastCell2(xp + ym, vec2(1.0 - f.x, -1.0 - f.y), sum);
    sum = strFastCell2(xp + yp, vec2(1.0 - f.x, 1.0 - f.y), sum);
  }
  return sum;
}

float strFastPlane3(uint xc, uint ymz, uint ycz, uint ypz, vec2 fxy, float bz, float zz, float sumin) {
  float sum = sumin;
  sum = strFastCell3(xc + ycz, vec3(-fxy.x, -fxy.y, bz), sum);
  sum = strFastCell3(xc + ymz, vec3(-fxy.x, -1.0 - fxy.y, bz), sum);
  sum = strFastCell3(xc + ypz, vec3(-fxy.x, 1.0 - fxy.y, bz), sum);
  if (fxy.x * fxy.x + zz < 0.77) {
    uint xm = xc - LATTICE_HX;
    sum = strFastCell3(xm + ycz, vec3(-1.0 - fxy.x, -fxy.y, bz), sum);
    sum = strFastCell3(xm + ymz, vec3(-1.0 - fxy.x, -1.0 - fxy.y, bz), sum);
    sum = strFastCell3(xm + ypz, vec3(-1.0 - fxy.x, 1.0 - fxy.y, bz), sum);
  }
  float gx = 1.0 - fxy.x;
  if (gx * gx + zz < 0.77) {
    uint xp = xc + LATTICE_HX;
    sum = strFastCell3(xp + ycz, vec3(1.0 - fxy.x, -fxy.y, bz), sum);
    sum = strFastCell3(xp + ymz, vec3(1.0 - fxy.x, -1.0 - fxy.y, bz), sum);
    sum = strFastCell3(xp + ypz, vec3(1.0 - fxy.x, 1.0 - fxy.y, bz), sum);
  }
  return sum;
}

float starsFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  uint ym = yc - LATTICE_HY;
  uint yp = yc + LATTICE_HY;
  float sum = strFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 0.0);
  float zzm = f.z * f.z;
  if (zzm < 0.77) {
    uint zm = zc - LATTICE_HZ;
    sum = strFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, sum);
  }
  float gz = 1.0 - f.z;
  float zzp = gz * gz;
  if (zzp < 0.77) {
    uint zp = zc + LATTICE_HZ;
    sum = strFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, sum);
  }
  return sum;
}
`
