// GLSL counterpart of truchet-tileable.ts. Requires COMMON_GLSL.

export const TRUCHET_TILEABLE_GLSL = /* glsl */ `
float truchet2T(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = p - i;
  if ((hash2u(imod(int(i.x), int(per.x)), imod(int(i.y), int(per.y))) & 1u) == 1u) { f.x = 1.0 - f.x; }
  float d1 = abs(length(f) - 0.5);
  float d2 = abs(length(f - 1.0) - 0.5);
  return cos(min(d1, d2) * 6.283185307179586 * 3.0);
}
`
