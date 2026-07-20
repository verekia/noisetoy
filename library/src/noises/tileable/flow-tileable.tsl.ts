// TSL counterpart of flow-tileable.ts. Requires COMMON_TSL and FLOW_TSL
// (for rotGradDot2).

export const FLOW_TILEABLE_TSL = /* js */ `
const flow3T = Fn(([p, per]) => {
  const i = floor(p.xy)
  const f = p.xy.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const ph = p.z.mul(6.283185307179586).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = imod(int(i.x), px).toVar()
  const x1 = imod(int(i.x).add(1), px).toVar()
  const y0 = imod(int(i.y), py).toVar()
  const y1 = imod(int(i.y).add(1), py).toVar()
  const g00 = rotGradDot2(hash2u(x0, y0), ph, f)
  const g10 = rotGradDot2(hash2u(x1, y0), ph, f.sub(vec2(1, 0)))
  const g01 = rotGradDot2(hash2u(x0, y1), ph, f.sub(vec2(0, 1)))
  const g11 = rotGradDot2(hash2u(x1, y1), ph, f.sub(vec2(1, 1)))
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy)
})
`
