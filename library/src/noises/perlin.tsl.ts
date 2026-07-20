// TSL counterpart of perlin.ts. Requires COMMON_TSL.
// Note TSL's select(condition, ifTrue, ifFalse) argument order, which is the
// reverse of WGSL's.

export const PERLIN_TSL = /* js */ `
const perlin2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const g00 = gradTable2(lowbias32(x0.add(y0)), f)
  const g10 = gradTable2(lowbias32(x1.add(y0)), f.sub(vec2(1, 0)))
  const g01 = gradTable2(lowbias32(x0.add(y1)), f.sub(vec2(0, 1)))
  const g11 = gradTable2(lowbias32(x1.add(y1)), f.sub(vec2(1, 1)))
  return mix(mix(g00, g10, ux), mix(g01, g11, ux), uy)
})

const perlin3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const uz = fade(f.z)
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const g000 = gradTable3(lowbias32(x0.add(y0).add(z0)), f)
  const g100 = gradTable3(lowbias32(x1.add(y0).add(z0)), f.sub(vec3(1, 0, 0)))
  const g010 = gradTable3(lowbias32(x0.add(y1).add(z0)), f.sub(vec3(0, 1, 0)))
  const g110 = gradTable3(lowbias32(x1.add(y1).add(z0)), f.sub(vec3(1, 1, 0)))
  const g001 = gradTable3(lowbias32(x0.add(y0).add(z1)), f.sub(vec3(0, 0, 1)))
  const g101 = gradTable3(lowbias32(x1.add(y0).add(z1)), f.sub(vec3(1, 0, 1)))
  const g011 = gradTable3(lowbias32(x0.add(y1).add(z1)), f.sub(vec3(0, 1, 1)))
  const g111 = gradTable3(lowbias32(x1.add(y1).add(z1)), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy)
  const nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy)
  return mix(nz0, nz1, uz)
})
`
