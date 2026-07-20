// TSL counterpart of value.ts. Requires COMMON_TSL.

export const VALUE_TSL = /* js */ `
const value2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const n00 = to01(hash2u(ix, iy))
  const n10 = to01(hash2u(ix.add(1), iy))
  const n01 = to01(hash2u(ix, iy.add(1)))
  const n11 = to01(hash2u(ix.add(1), iy.add(1)))
  return mix(mix(n00, n10, ux), mix(n01, n11, ux), uy)
})

const value3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const uz = fade(f.z)
  const n000 = to01(hash3u(ix, iy, iz))
  const n100 = to01(hash3u(ix.add(1), iy, iz))
  const n010 = to01(hash3u(ix, iy.add(1), iz))
  const n110 = to01(hash3u(ix.add(1), iy.add(1), iz))
  const n001 = to01(hash3u(ix, iy, iz.add(1)))
  const n101 = to01(hash3u(ix.add(1), iy, iz.add(1)))
  const n011 = to01(hash3u(ix, iy.add(1), iz.add(1)))
  const n111 = to01(hash3u(ix.add(1), iy.add(1), iz.add(1)))
  const nz0 = mix(mix(n000, n100, ux), mix(n010, n110, ux), uy)
  const nz1 = mix(mix(n001, n101, ux), mix(n011, n111, ux), uy)
  return mix(nz0, nz1, uz)
})
`
