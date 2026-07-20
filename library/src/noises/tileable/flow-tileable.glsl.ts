// GLSL counterpart of flow-tileable.ts. Requires COMMON_GLSL and FLOW_GLSL
// (for rotGradDot2).

export const FLOW_TILEABLE_GLSL = /* glsl */ `
float flow3T(vec3 p, vec2 per) {
  vec2 i = floor(p.xy);
  vec2 f = p.xy - i;
  float ux = fade(f.x);
  float uy = fade(f.y);
  float ph = p.z * 6.283185307179586;
  int px = int(per.x);
  int py = int(per.y);
  int x0 = imod(int(i.x), px);
  int x1 = imod(int(i.x) + 1, px);
  int y0 = imod(int(i.y), py);
  int y1 = imod(int(i.y) + 1, py);
  float g00 = rotGradDot2(hash2u(x0, y0), ph, f);
  float g10 = rotGradDot2(hash2u(x1, y0), ph, f - vec2(1.0, 0.0));
  float g01 = rotGradDot2(hash2u(x0, y1), ph, f - vec2(0.0, 1.0));
  float g11 = rotGradDot2(hash2u(x1, y1), ph, f - vec2(1.0, 1.0));
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy);
}
`
