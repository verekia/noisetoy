// TSL counterpart of simplex-tileable.ts (4D torus trick).
// Requires COMMON_TSL and SIMPLEX4_TSL.

export const SIMPLEX_TILEABLE_TSL = /* js */ `
const simplex2T = Fn(([p, per]) => {
  const a = p.div(per).mul(6.283185307179586)
  const r = per.div(6.283185307179586)
  return simplex4(vec4(r.x.mul(cos(a.x)), r.x.mul(sin(a.x)), r.y.mul(cos(a.y)), r.y.mul(sin(a.y))))
})
`
