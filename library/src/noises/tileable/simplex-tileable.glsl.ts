// GLSL counterpart of simplex-tileable.ts. Requires COMMON_GLSL and SIMPLEX4_GLSL.

export const SIMPLEX_TILEABLE_GLSL = /* glsl */ `
float simplex2T(vec2 p, vec2 per) {
  const float TAU = 6.283185307179586;
  vec2 a = p / per * TAU;
  vec2 r = per / TAU;
  return simplex4(vec4(r.x * cos(a.x), r.x * sin(a.x), r.y * cos(a.y), r.y * sin(a.y)));
}
`
