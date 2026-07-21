// WGSL counterpart of flow-fast.ts. Requires COMMON_WGSL and FAST_COMMON_WGSL.
// Note WGSL's select(falseValue, trueValue, condition) argument order.

export const FLOW_FAST_WGSL = /* wgsl */ `
fn flowFastCorner(h: u32, d: vec2f, c1: f32, s1: f32, c2: f32, s2: f32) -> f32 {
  let dir = h >> 29u;
  let S8 = 0.7071067811865476;
  let diagX = select(-S8, S8, dir == 1u || dir == 7u);
  let diagY = select(-S8, S8, dir == 1u || dir == 3u);
  let gx = select(select(diagX, 0.0, (dir & 1u) == 0u), select(-1.0, 1.0, dir == 0u), dir == 0u || dir == 4u);
  let gy = select(select(diagY, 0.0, (dir & 1u) == 0u), select(-1.0, 1.0, dir == 2u), dir == 2u || dir == 6u);
  let p = gx * d.x + gy * d.y;
  let q = gx * d.y - gy * d.x;
  let ck = select(c2, c1, (h & 0x10000000u) == 0u);
  let sk = select(s2, s1, (h & 0x10000000u) == 0u);
  return ck * p + select(-sk, sk, (h & 0x08000000u) == 0u) * q;
}

fn flowFast3(p: vec3f) -> f32 {
  let i = floor(p.xy);
  let f = p.xy - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let ph = p.z * 6.283185307179586;
  let c1 = cos(ph);
  let s1 = sin(ph);
  let c2 = c1 * c1 - s1 * s1;
  let s2 = 2.0 * s1 * c1;
  let x0 = bitcast<u32>(i32(i.x)) * LATTICE_HX;
  let y0 = bitcast<u32>(i32(i.y)) * LATTICE_HY;
  let x1 = x0 + LATTICE_HX;
  let y1 = y0 + LATTICE_HY;
  let rx0 = x0 ^ (x0 >> 16u);
  let rx1 = x1 ^ (x1 >> 16u);
  let n00 = flowFastCorner((rx0 ^ y0) * ALT_FIB, f, c1, s1, c2, s2);
  let n10 = flowFastCorner((rx1 ^ y0) * ALT_FIB, f - vec2f(1.0, 0.0), c1, s1, c2, s2);
  let n01 = flowFastCorner((rx0 ^ y1) * ALT_FIB, f - vec2f(0.0, 1.0), c1, s1, c2, s2);
  let n11 = flowFastCorner((rx1 ^ y1) * ALT_FIB, f - vec2f(1.0, 1.0), c1, s1, c2, s2);
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy);
}
`
