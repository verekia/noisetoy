// GLSL counterpart of white.ts. Requires COMMON_GLSL.

export const WHITE_GLSL = /* glsl */ `
float white2(vec2 p) {
  vec2 i = floor(p);
  return to01(hash2u(int(i.x), int(i.y)));
}

float white3(vec3 p) {
  vec3 i = floor(p);
  return to01(hash3u(int(i.x), int(i.y), int(i.z)));
}
`
