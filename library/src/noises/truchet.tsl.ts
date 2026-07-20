// TSL counterpart of truchet.ts. Requires COMMON_TSL.

export const TRUCHET_TSL = /* js */ `
const truchet2 = Fn(([p]) => {
  const i = floor(p)
  const fy = p.y.sub(i.y)
  const fx = p.x.sub(i.x).toVar()
  If(hash2u(int(i.x), int(i.y)).bitAnd(uint(1)).equal(uint(1)), () => {
    fx.assign(fx.oneMinus())
  })
  const d1 = sqrt(fx.mul(fx).add(fy.mul(fy))).sub(0.5).abs()
  const gx = fx.sub(1)
  const gy = fy.sub(1)
  const d2 = sqrt(gx.mul(gx).add(gy.mul(gy))).sub(0.5).abs()
  return cos(d1.min(d2).mul(6.283185307179586 * 3))
})
`
