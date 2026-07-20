// TSL counterpart of simplex-loop.ts. Requires COMMON_TSL and SIMPLEX4_TSL.

export const SIMPLEX_LOOP_TSL = /* js */ `
const simplexLoop3 = Fn(([p]) => {
  const a = p.z.mul(6.283185307179586).toVar()
  return simplex4(vec4(p.x, p.y, cos(a).mul(0.15915494309189535), sin(a).mul(0.15915494309189535)))
})
`
