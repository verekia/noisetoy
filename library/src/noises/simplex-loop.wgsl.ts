// WGSL counterpart of simplex-loop.ts. Requires COMMON_WGSL and SIMPLEX4_WGSL.

export const SIMPLEX_LOOP_WGSL = /* wgsl */ `
fn simplexLoop3(p: vec3f) -> f32 {
  let a = p.z * 6.283185307179586;
  return simplex4(vec4f(p.x, p.y, 0.15915494309189535 * cos(a), 0.15915494309189535 * sin(a)));
}
`
