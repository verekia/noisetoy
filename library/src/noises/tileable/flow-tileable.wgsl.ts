// WGSL counterpart of flow-tileable.ts. Requires COMMON_WGSL and FLOW_WGSL
// (for rotGradDot2).

export const FLOW_TILEABLE_WGSL = /* wgsl */ `
fn flow3T(p: vec3f, per: vec2f) -> f32 {
  let i = floor(p.xy);
  let f = p.xy - i;
  let ux = fade(f.x);
  let uy = fade(f.y);
  let ph = p.z * 6.283185307179586;
  let px = i32(per.x);
  let py = i32(per.y);
  let x0 = imod(i32(i.x), px);
  let x1 = imod(i32(i.x) + 1, px);
  let y0 = imod(i32(i.y), py);
  let y1 = imod(i32(i.y) + 1, py);
  let g00 = rotGradDot2(hash2u(x0, y0), ph, f);
  let g10 = rotGradDot2(hash2u(x1, y0), ph, f - vec2f(1.0, 0.0));
  let g01 = rotGradDot2(hash2u(x0, y1), ph, f - vec2f(0.0, 1.0));
  let g11 = rotGradDot2(hash2u(x1, y1), ph, f - vec2f(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}
`
