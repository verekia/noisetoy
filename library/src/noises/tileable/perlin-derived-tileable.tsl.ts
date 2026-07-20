// TSL counterpart of perlin-derived-tileable.ts.
// Requires COMMON_TSL and PERLIN_TILEABLE_TSL.

export const PERLIN_DERIVED_TILEABLE_TSL = /* js */ `
const turb2T = Fn(([p, per]) =>
  abs(perlin2T(p, per))
    .add(abs(perlin2T(p.mul(2), per.mul(2))).mul(0.5))
    .add(abs(perlin2T(p.mul(4), per.mul(4))).mul(0.25)),
)

const turb3T = Fn(([p, per]) =>
  abs(perlin3T(p, per))
    .add(abs(perlin3T(p.mul(2), per.mul(2))).mul(0.5))
    .add(abs(perlin3T(p.mul(4), per.mul(4))).mul(0.25)),
)

const marble2T = Fn(([p, per]) => cos(p.x.add(turb2T(p, per).mul(1.5)).mul(3.141592653589793)))

const marble3T = Fn(([p, per]) => cos(p.x.add(turb3T(p, per).mul(1.5)).mul(3.141592653589793)))

const contour2T = Fn(([p, per]) => cos(perlin2T(p, per).mul(12)))

const contour3T = Fn(([p, per]) => cos(perlin3T(p, per).mul(12)))
`
