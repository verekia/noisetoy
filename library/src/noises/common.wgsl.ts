// WGSL counterpart of common.ts. Kept line-for-line comparable.
//
// lowbias32 by Chris Wellons (public domain): https://nullprogram.com/blog/2018/07/31/

export const COMMON_WGSL = /* wgsl */ `
fn lowbias32(x0: u32) -> u32 {
  var x = x0;
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

fn hash2u(x: i32, y: i32) -> u32 { return lowbias32(bitcast<u32>(x) ^ lowbias32(bitcast<u32>(y))); }

fn hash3u(x: i32, y: i32, z: i32) -> u32 {
  return lowbias32(bitcast<u32>(x) ^ lowbias32(bitcast<u32>(y) ^ lowbias32(bitcast<u32>(z))));
}

fn hash4u(x: i32, y: i32, z: i32, w: i32) -> u32 {
  return lowbias32(bitcast<u32>(x) ^ lowbias32(bitcast<u32>(y) ^ lowbias32(bitcast<u32>(z) ^ lowbias32(bitcast<u32>(w)))));
}

fn to01(h: u32) -> f32 { return f32(h) * (1.0 / 4294967296.0); }

fn fade(t: f32) -> f32 { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

fn imod(a: i32, b: i32) -> i32 { return ((a % b) + b) % b; }

const LATTICE_HX: u32 = 0x27d4eb2fu;
const LATTICE_HY: u32 = 0x85ebca6bu;
const LATTICE_HZ: u32 = 0xc2b2ae35u;

fn gradTable2(h: u32, d: vec2f) -> f32 {
  let hi = h & 7u;
  let u = select(d.y, d.x, hi < 4u);
  let v = select(d.x, d.y, hi < 4u);
  return select(-u, u, (hi & 1u) == 0u) + select(-v, v, (hi & 2u) == 0u);
}

fn gradTable3(h: u32, d: vec3f) -> f32 {
  let t = h >> 2u;
  let axis = select(select(2, 1, t < 715827882u), 0, t < 357913941u);
  let a = select(d.x, d.y, axis == 2);
  let b = select(d.z, d.y, axis == 0);
  return select(-a, a, (h & 1u) == 0u) + select(-b, b, (h & 2u) == 0u);
}

fn gradDot2(h: u32, d: vec2f) -> f32 {
  let a = to01(h) * 6.283185307179586;
  return dot(vec2f(cos(a), sin(a)), d);
}

fn gradDot3(h: u32, d: vec3f) -> f32 {
  let gz = to01(h) * 2.0 - 1.0;
  let a = to01(lowbias32(h)) * 6.283185307179586;
  let r = sqrt(max(0.0, 1.0 - gz * gz));
  return dot(vec3f(r * cos(a), r * sin(a), gz), d);
}
`
