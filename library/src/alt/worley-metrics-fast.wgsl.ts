// WGSL counterpart of worley-metrics-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL. See the GLSL file for the metric-specific prune bounds.

export const WORLEY_METRICS_FAST_WGSL = /* wgsl */ `
fn wmFastOffsets2(s: u32) -> vec2f {
  var h = fibMix(s);
  h ^= h >> 16u;
  return vec2f(f32(h >> 16u), f32(h & 0xffffu)) * (1.0 / 65536.0);
}

fn wmFastOffsets3(s: u32) -> vec3f {
  let h = lowbias32(s);
  return vec3f(f32(h >> 22u), f32((h >> 12u) & 1023u), f32((h >> 2u) & 1023u)) * (1.0 / 1024.0);
}

fn mFastCell2(s: u32, b: vec2f, f1: f32) -> f32 {
  let v = abs(b + wmFastOffsets2(s));
  return min(f1, v.x + v.y);
}

fn cFastCell2(s: u32, b: vec2f, f1: f32) -> f32 {
  let v = abs(b + wmFastOffsets2(s));
  return min(f1, max(v.x, v.y));
}

fn manhattanFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = mFastCell2(xc + yc, vec2f(-f.x, -f.y), 1e9);
  f1 = mFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), f1);
  f1 = mFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), f1);
  if (f.x < f1) {
    let xm = xc - LATTICE_HX;
    f1 = mFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), f1);
    f1 = mFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = mFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), f1);
  }
  if (1.0 - f.x < f1) {
    let xp = xc + LATTICE_HX;
    f1 = mFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), f1);
    f1 = mFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), f1);
    f1 = mFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), f1);
  }
  return f1;
}

fn chebyshevFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = cFastCell2(xc + yc, vec2f(-f.x, -f.y), 1e9);
  f1 = cFastCell2(xc + ym, vec2f(-f.x, -1.0 - f.y), f1);
  f1 = cFastCell2(xc + yp, vec2f(-f.x, 1.0 - f.y), f1);
  if (f.x < f1) {
    let xm = xc - LATTICE_HX;
    f1 = cFastCell2(xm + yc, vec2f(-1.0 - f.x, -f.y), f1);
    f1 = cFastCell2(xm + ym, vec2f(-1.0 - f.x, -1.0 - f.y), f1);
    f1 = cFastCell2(xm + yp, vec2f(-1.0 - f.x, 1.0 - f.y), f1);
  }
  if (1.0 - f.x < f1) {
    let xp = xc + LATTICE_HX;
    f1 = cFastCell2(xp + yc, vec2f(1.0 - f.x, -f.y), f1);
    f1 = cFastCell2(xp + ym, vec2f(1.0 - f.x, -1.0 - f.y), f1);
    f1 = cFastCell2(xp + yp, vec2f(1.0 - f.x, 1.0 - f.y), f1);
  }
  return f1;
}

fn mFastCell3(s: u32, b: vec3f, f1: f32) -> f32 {
  let v = abs(b + wmFastOffsets3(s));
  return min(f1, v.x + v.y + v.z);
}

fn cFastCell3(s: u32, b: vec3f, f1: f32) -> f32 {
  let v = abs(b + wmFastOffsets3(s));
  return min(f1, max(v.x, max(v.y, v.z)));
}

fn mFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zclear: f32, f1in: f32) -> f32 {
  var f1 = f1in;
  f1 = mFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), f1);
  f1 = mFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = mFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (fxy.x + zclear < f1) {
    let xm = xc - LATTICE_HX;
    f1 = mFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = mFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = mFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  if (1.0 - fxy.x + zclear < f1) {
    let xp = xc + LATTICE_HX;
    f1 = mFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = mFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = mFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

fn cFastPlane3(xc: u32, ymz: u32, ycz: u32, ypz: u32, fxy: vec2f, bz: f32, zclear: f32, f1in: f32) -> f32 {
  var f1 = f1in;
  f1 = cFastCell3(xc + ycz, vec3f(-fxy.x, -fxy.y, bz), f1);
  f1 = cFastCell3(xc + ymz, vec3f(-fxy.x, -1.0 - fxy.y, bz), f1);
  f1 = cFastCell3(xc + ypz, vec3f(-fxy.x, 1.0 - fxy.y, bz), f1);
  if (max(fxy.x, zclear) < f1) {
    let xm = xc - LATTICE_HX;
    f1 = cFastCell3(xm + ycz, vec3f(-1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = cFastCell3(xm + ymz, vec3f(-1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = cFastCell3(xm + ypz, vec3f(-1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  if (max(1.0 - fxy.x, zclear) < f1) {
    let xp = xc + LATTICE_HX;
    f1 = cFastCell3(xp + ycz, vec3f(1.0 - fxy.x, -fxy.y, bz), f1);
    f1 = cFastCell3(xp + ymz, vec3f(1.0 - fxy.x, -1.0 - fxy.y, bz), f1);
    f1 = cFastCell3(xp + ypz, vec3f(1.0 - fxy.x, 1.0 - fxy.y, bz), f1);
  }
  return f1;
}

fn manhattanFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = mFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  if (f.z < f1) {
    let zm = zc - LATTICE_HZ;
    f1 = mFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, f.z, f1);
  }
  if (1.0 - f.z < f1) {
    let zp = zc + LATTICE_HZ;
    f1 = mFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, 1.0 - f.z, f1);
  }
  return f1;
}

fn chebyshevFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let xc = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let yc = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let zc = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let ym = yc - LATTICE_HY;
  let yp = yc + LATTICE_HY;
  var f1 = cFastPlane3(xc, ym + zc, yc + zc, yp + zc, f.xy, -f.z, 0.0, 1e9);
  if (f.z < f1) {
    let zm = zc - LATTICE_HZ;
    f1 = cFastPlane3(xc, ym + zm, yc + zm, yp + zm, f.xy, -1.0 - f.z, f.z, f1);
  }
  if (1.0 - f.z < f1) {
    let zp = zc + LATTICE_HZ;
    f1 = cFastPlane3(xc, ym + zp, yc + zp, yp + zp, f.xy, 1.0 - f.z, 1.0 - f.z, f1);
  }
  return f1;
}
`
