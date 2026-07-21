// GLSL counterpart of gabor-fast.ts. Requires COMMON_GLSL and
// FAST_COMMON_GLSL. The orientation table becomes cos/sin of the quantized
// angle — trig is cheap on a GPU and matches the TS table values.
// 3.141592653589793 is GABOR_ENVELOPE; 12.566370614359172 is 2*pi*GABOR_FREQ;
// 0.09817477042468103 is 2*pi/64; 0.02454369260617026 is 2*pi/256.

export const GABOR_FAST_GLSL = /* glsl */ `
float gaborFast2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  float sum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    uint yh = yc + uint(dy) * LATTICE_HY;
    for (int dx = -1; dx <= 1; dx++) {
      uint s = xc + uint(dx) * LATTICE_HX + yh;
      uint h = fibMix(s);
      h ^= h >> 16u;
      vec2 v = vec2(float(dx), float(dy)) + vec2(float(h >> 16u), float(h & 0xffffu)) * (1.0 / 65536.0) - f;
      float d2 = dot(v, v);
      if (d2 < 2.25) {
        uint bh = (h ^ (h >> 15u)) * ALT_FIB;
        float w = float((bh >> 10u) & 255u) * (1.0 / 128.0) - 1.0;
        float ph = float((bh >> 18u) & 255u) * 0.02454369260617026;
        float a = float(bh >> 26u) * 0.09817477042468103;
        float proj = dot(vec2(cos(a), sin(a)), v);
        sum += w * exp(-3.141592653589793 * d2) * cos(12.566370614359172 * proj + ph);
      }
    }
  }
  return sum;
}

float gaborFast3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  uint xc = uint(int(i.x)) * LATTICE_HX;
  uint yc = uint(int(i.y)) * LATTICE_HY;
  uint zc = uint(int(i.z)) * LATTICE_HZ;
  float sum = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    uint zh = zc + uint(dz) * LATTICE_HZ;
    for (int dy = -1; dy <= 1; dy++) {
      uint yh = yc + uint(dy) * LATTICE_HY + zh;
      for (int dx = -1; dx <= 1; dx++) {
        uint s = xc + uint(dx) * LATTICE_HX + yh;
        uint h = lowbias32(s);
        vec3 v = vec3(float(dx), float(dy), float(dz))
          + vec3(float(h >> 22u), float((h >> 12u) & 1023u), float((h >> 2u) & 1023u)) * (1.0 / 1024.0) - f;
        float d2 = dot(v, v);
        if (d2 < 2.25) {
          uint bh = (h ^ (h >> 15u)) * ALT_FIB;
          float w = float((bh >> 2u) & 255u) * (1.0 / 128.0) - 1.0;
          float ph = float((bh >> 10u) & 255u) * 0.02454369260617026;
          float a = float((bh >> 20u) & 63u) * 0.09817477042468103;
          float kz = float(bh >> 26u) * 0.03125 - 0.984375;
          float r = sqrt(1.0 - kz * kz);
          float proj = dot(vec3(r * cos(a), r * sin(a), kz), v);
          sum += w * exp(-3.141592653589793 * d2) * cos(12.566370614359172 * proj + ph);
        }
      }
    }
  }
  return sum;
}
`
