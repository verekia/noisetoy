// TSL counterpart of perlin-derived.ts (Marble, Contour).
// Requires COMMON_TSL and PERLIN_TSL.

export const PERLIN_DERIVED_TSL = /* js */ `
const turb2 = Fn(([p]) =>
  abs(perlin2(p)).add(abs(perlin2(p.mul(2))).mul(0.5)).add(abs(perlin2(p.mul(4))).mul(0.25)),
)

const turb3 = Fn(([p]) =>
  abs(perlin3(p)).add(abs(perlin3(p.mul(2))).mul(0.5)).add(abs(perlin3(p.mul(4))).mul(0.25)),
)

const marble2 = Fn(([p]) => cos(p.x.add(turb2(p).mul(1.5)).mul(3.141592653589793)))

const marble3 = Fn(([p]) => cos(p.x.add(turb3(p).mul(1.5)).mul(3.141592653589793)))

const contour2 = Fn(([p]) => cos(perlin2(p).mul(12)))

const contour3 = Fn(([p]) => cos(perlin3(p).mul(12)))
`
