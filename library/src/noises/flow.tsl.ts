// TSL counterpart of flow.ts. Requires COMMON_TSL.

export const FLOW_TSL = /* js */ `
const rotGradDot2 = Fn(([h, phase, d]) => {
  const b = lowbias32(h).bitAnd(uint(3)).toVar()
  const k = float(uint(1).add(b.shiftRight(uint(1)))).mul(float(b.bitAnd(uint(1))).mul(2).oneMinus())
  const a = to01(h).mul(6.283185307179586).add(k.mul(phase))
  return dot(vec2(cos(a), sin(a)), d)
})

const flow3 = Fn(([p]) => {
  const i = floor(p.xy)
  const f = p.xy.sub(i).toVar()
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const ph = p.z.mul(6.283185307179586).toVar()
  const g00 = rotGradDot2(hash2u(ix, iy), ph, f)
  const g10 = rotGradDot2(hash2u(ix.add(1), iy), ph, f.sub(vec2(1, 0)))
  const g01 = rotGradDot2(hash2u(ix, iy.add(1)), ph, f.sub(vec2(0, 1)))
  const g11 = rotGradDot2(hash2u(ix.add(1), iy.add(1)), ph, f.sub(vec2(1, 1)))
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy)
})
`
