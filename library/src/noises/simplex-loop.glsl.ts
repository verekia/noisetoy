// GLSL counterpart of simplex-loop.ts. Requires COMMON_GLSL and SIMPLEX4_GLSL.

export const SIMPLEX_LOOP_GLSL = /* glsl */ `
float simplexLoop3(vec3 p) {
  float a = p.z * 6.283185307179586;
  return simplex4(vec4(p.x, p.y, 0.15915494309189535 * cos(a), 0.15915494309189535 * sin(a)));
}
`
