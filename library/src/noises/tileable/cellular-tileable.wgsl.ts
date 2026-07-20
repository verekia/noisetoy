// WGSL counterpart of cellular-tileable.ts. Requires COMMON_WGSL.

export const CELLULAR_TILEABLE_WGSL = /* wgsl */ `
fn mosaic2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var best = 1e9;
  var bh = 0u;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let d2 = dot(v, v);
      if (d2 < best) { best = d2; bh = h; }
    }
  }
  return to01(lowbias32(lowbias32(bh)));
}

fn mosaic3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var best = 1e9;
  var bh = 0u;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let d2 = dot(v, v);
        if (d2 < best) { best = d2; bh = h; }
      }
    }
  }
  return to01(lowbias32(lowbias32(lowbias32(bh))));
}

fn crackle2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var f1 = 1e9;
  var f2 = 1e9;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let d2 = dot(v, v);
      if (d2 < f1) { f2 = f1; f1 = d2; }
      else if (d2 < f2) { f2 = d2; }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

fn crackle3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var f1 = 1e9;
  var f2 = 1e9;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let d2 = dot(v, v);
        if (d2 < f1) { f2 = f1; f1 = d2; }
        else if (d2 < f2) { f2 = d2; }
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

fn foam2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var m = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(lowbias32(h))) - f;
      let t = 1.21 - dot(v, v);
      if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
    }
  }
  return m;
}

fn foam3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var m = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(lowbias32(h2))) - f;
        let t = 1.21 - dot(v, v);
        if (t > 0.0) { m = max(m, sqrt(t) / 1.1); }
      }
    }
  }
  return m;
}

fn stars2T(p: vec2f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let h = hash2u(imod(ix + dx, px), imod(iy + dy, py));
      let h2 = lowbias32(h);
      let v = vec2f(f32(dx), f32(dy)) + vec2f(to01(h), to01(h2)) - f;
      sum += to01(lowbias32(h2)) * exp(-dot(v, v) * 18.0);
    }
  }
  return sum;
}

fn stars3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let iz = i32(i.z);
  let px = i32(per.x);
  let py = i32(per.y);
  var sum = 0.0;
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let h = hash3u(imod(ix + dx, px), imod(iy + dy, py), iz + dz);
        let h2 = lowbias32(h);
        let h3 = lowbias32(h2);
        let v = vec3f(f32(dx), f32(dy), f32(dz)) + vec3f(to01(h), to01(h2), to01(h3)) - f;
        sum += to01(lowbias32(h3)) * exp(-dot(v, v) * 18.0);
      }
    }
  }
  return sum;
}
`
