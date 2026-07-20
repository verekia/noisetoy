// TSL counterpart of white.ts. Requires COMMON_TSL.

export const WHITE_TSL = /* js */ `
const white2 = Fn(([p]) => {
  const i = floor(p)
  return to01(hash2u(int(i.x), int(i.y)))
})

const white3 = Fn(([p]) => {
  const i = floor(p)
  return to01(hash3u(int(i.x), int(i.y), int(i.z)))
})
`
