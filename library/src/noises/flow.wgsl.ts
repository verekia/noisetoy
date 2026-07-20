// WGSL counterpart of flow.ts. Requires COMMON_WGSL.

export const FLOW_WGSL = /* wgsl */ `
fn rotGradDot2(h: u32, phase: f32, d: vec2f) -> f32 {
  let b = lowbias32(h) & 3u;
  let k = f32(1u + (b >> 1u)) * (1.0 - 2.0 * f32(b & 1u));
  let a = to01(h) * 6.283185307179586 + k * phase;
  return dot(vec2f(cos(a), sin(a)), d);
}

fn flow3(p: vec3f) -> f32 {
  let i = floor(p.xy);
  let f = p.xy - i;
  let ix = i32(i.x);
  let iy = i32(i.y);
  let ux = fade(f.x);
  let uy = fade(f.y);
  let ph = p.z * 6.283185307179586;
  let g00 = rotGradDot2(hash2u(ix, iy), ph, f);
  let g10 = rotGradDot2(hash2u(ix + 1, iy), ph, f - vec2f(1.0, 0.0));
  let g01 = rotGradDot2(hash2u(ix, iy + 1), ph, f - vec2f(0.0, 1.0));
  let g11 = rotGradDot2(hash2u(ix + 1, iy + 1), ph, f - vec2f(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}
`
