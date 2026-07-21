// WGSL counterpart of vortex-fast.ts. Requires COMMON_WGSL and
// FAST_COMMON_WGSL.

export const VORTEX_FAST_WGSL = /* wgsl */ `
fn vtxFastDir(h: u32) -> vec2f {
  let t = (h >> 28u) & 3u;
  let bx = select(select(select(0.3826834323650898, 0.7071067811865476, t == 2u), 0.9238795325112867, t == 1u), 1.0, t == 0u);
  let by = select(select(select(0.9238795325112867, 0.7071067811865476, t == 2u), 0.3826834323650898, t == 1u), 0.0, t == 0u);
  let q = h >> 30u;
  if (q == 0u) { return vec2f(bx, by); }
  if (q == 1u) { return vec2f(-by, bx); }
  if (q == 2u) { return vec2f(-bx, -by); }
  return vec2f(by, -bx);
}

fn vortexFast2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let rx0 = x0 ^ (x0 >> 16u);
  let rx1 = x1 ^ (x1 >> 16u);
  var s = (1.0 - ux) * (1.0 - uy) * vtxFastDir((rx0 ^ y0) * ALT_FIB);
  s += ux * (1.0 - uy) * vtxFastDir((rx1 ^ y0) * ALT_FIB);
  s += (1.0 - ux) * uy * vtxFastDir((rx0 ^ y1) * ALT_FIB);
  s += ux * uy * vtxFastDir((rx1 ^ y1) * ALT_FIB);
  let a = s.x * s.x;
  let b = s.y * s.y;
  let n = a + b;
  return select(1.0, (a - b) / n, n > 0.0);
}

fn vtxFastCorner3(s: u32) -> vec2f {
  let h = lowbias32(s);
  return vtxFastDir(h) * (f32((h >> 18u) & 1023u) * (1.0 / 1024.0));
}

fn vortexFast3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let uz = fade(f.z);
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let z0 = bitcast<u32>(i32(i.z)) * LATTICE_HZ;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let z1 = z0 + LATTICE_HZ;
  let xy00 = x0 + y0;
  let xy10 = x1 + y0;
  let xy01 = x0 + y1;
  let xy11 = x1 + y1;
  let vx = 1.0 - ux;
  let vy = 1.0 - uy;
  let vz = 1.0 - uz;
  var s = vx * vy * vz * vtxFastCorner3(xy00 + z0);
  s += ux * vy * vz * vtxFastCorner3(xy10 + z0);
  s += vx * uy * vz * vtxFastCorner3(xy01 + z0);
  s += ux * uy * vz * vtxFastCorner3(xy11 + z0);
  s += vx * vy * uz * vtxFastCorner3(xy00 + z1);
  s += ux * vy * uz * vtxFastCorner3(xy10 + z1);
  s += vx * uy * uz * vtxFastCorner3(xy01 + z1);
  s += ux * uy * uz * vtxFastCorner3(xy11 + z1);
  let a = s.x * s.x;
  let b = s.y * s.y;
  let n = a + b;
  return select(1.0, (a - b) / n, n > 0.0);
}
`
