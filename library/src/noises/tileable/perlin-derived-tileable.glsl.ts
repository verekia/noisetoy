// GLSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_GLSL and PERLIN_TILEABLE_GLSL.

export const PERLIN_DERIVED_TILEABLE_GLSL = /* glsl */ `
float turb2T(vec2 p, vec2 per) {
  return abs(perlin2T(p, per)) + 0.5 * abs(perlin2T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin2T(p * 4.0, per * 4.0));
}

float turb3T(vec3 p, vec2 per) {
  return abs(perlin3T(p, per)) + 0.5 * abs(perlin3T(p * 2.0, per * 2.0)) + 0.25 * abs(perlin3T(p * 4.0, per * 4.0));
}

float marble2T(vec2 p, vec2 per) { return cos((p.x + 1.5 * turb2T(p, per)) * 3.141592653589793); }

float marble3T(vec3 p, vec2 per) { return cos((p.x + 1.5 * turb3T(p, per)) * 3.141592653589793); }

float contour2T(vec2 p, vec2 per) { return cos(perlin2T(p, per) * 12.0); }

float contour3T(vec3 p, vec2 per) { return cos(perlin3T(p, per) * 12.0); }
`
