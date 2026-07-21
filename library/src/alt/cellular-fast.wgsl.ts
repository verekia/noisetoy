// WGSL counterpart of cellular-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. Winner tracking via ptr<function> parameters.

export const CELLULAR_FAST_WGSL = /* wgsl */ `
fn mosFastCell2(s: u32, b: vec2f, f1: f32, sb: ptr<function, u32>) -> f32 {
  var h = fibMix(s);
  h ^= h >> 16u;
  let v = b + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
  let d = dot(v, v);
  if (d < f1) {
    *sb = s;
    return d;
  }
  return f1;
}

fn mosFastCell3(s: u32, b: vec3f, f1: f32, sb: ptr<function, u32>) -> f32 {
  let h = lowbias32(s);
  let v = b + vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  let d = dot(v, v);
  if (d < f1) {
    *sb = s;
    return d;
  }
  return f1;
}

fn mosaicFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var sb = 0u;
  var f1 = mosFastCell2(xc + yc, vec2f(-f.x, -f.y), 1e9, &sb);
  f1 = mosFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), f1, &sb);
  f1 = mosFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), f1, &sb);
  if (f.x * f.x < f1) {
    let xm = xc - LATTICE_HX;
    f1 = mosFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), f1, &sb);
    f1 = mosFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), f1, &sb);
    f1 = mosFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), f1, &sb);
  }
  let gx = 1.0 - f.x;
  if (gx * gx < f1) {
    let xp = xc + LATTICE_HX;
    f1 = mosFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), f1, &sb);
    f1 = mosFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), f1, &sb);
    f1 = mosFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), f1, &sb);
  }
  return to01(lowbias32(sb));
}

fn mosFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zz: f32, f1in: f32, sb: ptr<function, u32>) -> f32 {
  var f1 = f1in;
  f1 = mosFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), f1, sb);
  f1 = mosFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), f1, sb);
  f1 = mosFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), f1, sb);
  if (fxy.x * fxy.x + zz < f1) {
    let xm = xc - LATTICE_HX;
    f1 = mosFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1, sb);
  }
  let gx = 1.0 - fxy.x;
  if (gx * gx + zz < f1) {
    let xp = xc + LATTICE_HX;
    f1 = mosFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), f1, sb);
    f1 = mosFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), f1, sb);
  }
  return f1;
}

fn mosaicFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var sb = 0u;
  var f1 = mosFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9, &sb);
  let zzm = f.z * f.z;
  if (zzm < f1) {
    let zm = zc - LATTICE_HZ;
    f1 = mosFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, f1, &sb);
  }
  let gz = 1.0 - f.z;
  let zzp = gz * gz;
  if (zzp < f1) {
    let zp = zc + LATTICE_HZ;
    f1 = mosFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, f1, &sb);
  }
  return to01(lowbias32(sb));
}
fn crkFastCell2(s: u32, b: vec2f, ff: vec2f) -> vec2f {
  var h = fibMix(s);
  h ^= h >> 16u;
  let v = b + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
  let d = dot(v, v);
  if (d < ff.x) { return vec2f(d, ff.x); }
  if (d < ff.y) { return vec2f(ff.x, d); }
  return ff;
}

fn crkFastCell3(s: u32, b: vec3f, ff: vec2f) -> vec2f {
  let h = lowbias32(s);
  let v = b + vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  let d = dot(v, v);
  if (d < ff.x) { return vec2f(d, ff.x); }
  if (d < ff.y) { return vec2f(ff.x, d); }
  return ff;
}

fn crackleFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var ff = crkFastCell2(xc + yc, vec2f(-f.x, -f.y), vec2f(1e9, 1e9));
  ff = crkFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), ff);
  ff = crkFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), ff);
  if (f.x * f.x < ff.y) {
    let xm = xc - LATTICE_HX;
    ff = crkFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), ff);
    ff = crkFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), ff);
    ff = crkFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), ff);
  }
  let gx = 1.0 - f.x;
  if (gx * gx < ff.y) {
    let xp = xc + LATTICE_HX;
    ff = crkFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), ff);
    ff = crkFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), ff);
    ff = crkFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), ff);
  }
  return sqrt(ff.y) - sqrt(ff.x);
}

fn crkFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zz: f32, ffin: vec2f) -> vec2f {
  var ff = ffin;
  ff = crkFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), ff);
  ff = crkFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), ff);
  ff = crkFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), ff);
  if (fxy.x * fxy.x + zz < ff.y) {
    let xm = xc - LATTICE_HX;
    ff = crkFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), ff);
    ff = crkFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), ff);
    ff = crkFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), ff);
  }
  let gx = 1.0 - fxy.x;
  if (gx * gx + zz < ff.y) {
    let xp = xc + LATTICE_HX;
    ff = crkFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), ff);
    ff = crkFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), ff);
    ff = crkFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), ff);
  }
  return ff;
}

fn crackleFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var ff = crkFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, vec2f(1e9, 1e9));
  let zzm = f.z * f.z;
  if (zzm < ff.y) {
    let zm = zc - LATTICE_HZ;
    ff = crkFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, ff);
  }
  let gz = 1.0 - f.z;
  let zzp = gz * gz;
  if (zzp < ff.y) {
    let zp = zc + LATTICE_HZ;
    ff = crkFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, ff);
  }
  return sqrt(ff.y) - sqrt(ff.x);
}
fn foamFastCell2(s: u32, b: vec2f, q: f32) -> f32 {
  var h = fibMix(s);
  h ^= h >> 16u;
  let v = b + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
  return max(q, 1.21 - dot(v, v));
}

fn foamFastCell3(s: u32, b: vec3f, q: f32) -> f32 {
  let h = lowbias32(s);
  let v = b + vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  return max(q, 1.21 - dot(v, v));
}

fn foamFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var q = foamFastCell2(xc + yc, vec2f(-f.x, -f.y), 0.0);
  q = foamFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), q);
  q = foamFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), q);
  if (f.x * f.x < 1.21 - q) {
    let xm = xc - LATTICE_HX;
    q = foamFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), q);
    q = foamFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), q);
    q = foamFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), q);
  }
  let gx = 1.0 - f.x;
  if (gx * gx < 1.21 - q) {
    let xp = xc + LATTICE_HX;
    q = foamFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), q);
    q = foamFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), q);
    q = foamFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), q);
  }
  return select(0.0, sqrt(q) * (1.0 / 1.1), q > 0.0);
}

fn foamFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zz: f32, qin: f32) -> f32 {
  var q = qin;
  q = foamFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), q);
  q = foamFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), q);
  q = foamFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), q);
  if (fxy.x * fxy.x + zz < 1.21 - q) {
    let xm = xc - LATTICE_HX;
    q = foamFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), q);
    q = foamFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), q);
    q = foamFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), q);
  }
  let gx = 1.0 - fxy.x;
  if (gx * gx + zz < 1.21 - q) {
    let xp = xc + LATTICE_HX;
    q = foamFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), q);
    q = foamFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), q);
    q = foamFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), q);
  }
  return q;
}

fn foamFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var q = foamFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 0.0);
  let zzm = f.z * f.z;
  if (zzm < 1.21 - q) {
    let zm = zc - LATTICE_HZ;
    q = foamFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, q);
  }
  let gz = 1.0 - f.z;
  let zzp = gz * gz;
  if (zzp < 1.21 - q) {
    let zp = zc + LATTICE_HZ;
    q = foamFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, q);
  }
  return select(0.0, sqrt(q) * (1.0 / 1.1), q > 0.0);
}
fn strFastCell2(s: u32, b: vec2f, sum: f32) -> f32 {
  var h = fibMix(s);
  h ^= h >> 16u;
  let v = b + vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
  let d2 = dot(v, v);
  if (d2 < 0.77) {
    let bh = (h ^ (h >> 15u)) * ALT_FIB;
    return sum + f32(bh >> 8u) * (1.0 / 16777216.0) * exp(-d2 * 18.0);
  }
  return sum;
}

fn strFastCell3(s: u32, b: vec3f, sum: f32) -> f32 {
  let h = lowbias32(s);
  let v = b + vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
  let d2 = dot(v, v);
  if (d2 < 0.77) {
    let bh = (h ^ (h >> 15u)) * ALT_FIB;
    return sum + f32(bh >> 8u) * (1.0 / 16777216.0) * exp(-d2 * 18.0);
  }
  return sum;
}

fn starsFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var sum = strFastCell2(xc + yc, vec2f(-f.x, -f.y), 0.0);
  sum = strFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), sum);
  sum = strFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), sum);
  if (f.x * f.x < 0.77) {
    let xm = xc - LATTICE_HX;
    sum = strFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), sum);
    sum = strFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), sum);
    sum = strFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), sum);
  }
  let gx = 1.0 - f.x;
  if (gx * gx < 0.77) {
    let xp = xc + LATTICE_HX;
    sum = strFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), sum);
    sum = strFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), sum);
    sum = strFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), sum);
  }
  return sum;
}

fn strFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zz: f32, sumin: f32) -> f32 {
  var sum = sumin;
  sum = strFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), sum);
  sum = strFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), sum);
  sum = strFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), sum);
  if (fxy.x * fxy.x + zz < 0.77) {
    let xm = xc - LATTICE_HX;
    sum = strFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), sum);
    sum = strFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), sum);
    sum = strFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), sum);
  }
  let gx = 1.0 - fxy.x;
  if (gx * gx + zz < 0.77) {
    let xp = xc + LATTICE_HX;
    sum = strFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), sum);
    sum = strFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), sum);
    sum = strFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), sum);
  }
  return sum;
}

fn starsFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var sum = strFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 0.0);
  let zzm = f.z * f.z;
  if (zzm < 0.77) {
    let zm = zc - LATTICE_HZ;
    sum = strFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, zzm, sum);
  }
  let gz = 1.0 - f.z;
  let zzp = gz * gz;
  if (zzp < 0.77) {
    let zp = zc + LATTICE_HZ;
    sum = strFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, zzp, sum);
  }
  return sum;
}
`
