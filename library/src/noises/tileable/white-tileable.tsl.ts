// TSL counterpart of white-tileable.ts. Requires COMMON_TSL.

export const WHITE_TILEABLE_TSL = /* js */ `
const white2T = Fn(([p, per]) => {
  const i = floor(p)
  const x0 = imod(int(i.x), int(per.x)).toVar()
  const y0 = imod(int(i.y), int(per.y)).toVar()
  return to01(hash2u(x0, y0))
})

const white3T = Fn(([p, per]) => {
  const i = floor(p)
  const x0 = imod(int(i.x), int(per.x)).toVar()
  const y0 = imod(int(i.y), int(per.y)).toVar()
  return to01(hash3u(x0, y0, int(i.z)))
})
`
