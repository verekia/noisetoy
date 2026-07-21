// WGSL counterpart of fast-common.glsl.ts. Requires COMMON_WGSL.
// Note WGSL's select(falseValue, trueValue, condition) argument order.

export const FAST_COMMON_WGSL = /* wgsl */ `
const ALT_FIB: u32 = 0x9e3779b1u;

fn fibMix(s: u32) -> u32 {
  return (s ^ (s >> 16u)) * ALT_FIB;
}

fn lmfMix(s0: u32) -> u32 {
  var s = s0 ^ (s0 >> 16u);
  s *= 0x7feb352du;
  s ^= s >> 15u;
  s *= 0x846ca68bu;
  return s;
}

fn pickSD(h: u32, sv: f32, dv: f32) -> f32 {
  let v = select(dv, sv, (h & 0x40000000u) == 0u);
  return select(v, -v, h >= 0x80000000u);
}

fn gradFastDiag2(h: u32, d: vec2f) -> f32 {
  return select(d.x, -d.x, h >= 0x80000000u) + select(-d.y, d.y, (h & 0x40000000u) == 0u);
}

fn gradFast3(h: u32, d: vec3f) -> f32 {
  let t = h & 0x3fffffffu;
  let a = select(d.y, d.x, t < 715827882u);
  let b = select(d.z, d.y, t < 357913941u);
  return select(-a, a, (h & 0x40000000u) == 0u) + select(b, -b, h >= 0x80000000u);
}
`
