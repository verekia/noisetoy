// TSL counterpart of perlin-fast-tileable.ts. Requires COMMON_TSL (imod,
// LATTICE constants) and FAST_COMMON_TSL (lmfMix, gradFast3).

export const PERLIN_FAST_TILEABLE_TSL = /* js */ `
const perlinFast3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const uz = fade(f.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const x0 = uint(imod(int(i.x), px)).mul(LATTICE_HX).toVar()
  const x1 = uint(imod(int(i.x).add(1), px)).mul(LATTICE_HX).toVar()
  const y0 = uint(imod(int(i.y), py)).mul(LATTICE_HY).toVar()
  const y1 = uint(imod(int(i.y).add(1), py)).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const g000 = gradFast3(lmfMix(x0.add(y0).add(z0)), f)
  const g100 = gradFast3(lmfMix(x1.add(y0).add(z0)), f.sub(vec3(1, 0, 0)))
  const g010 = gradFast3(lmfMix(x0.add(y1).add(z0)), f.sub(vec3(0, 1, 0)))
  const g110 = gradFast3(lmfMix(x1.add(y1).add(z0)), f.sub(vec3(1, 1, 0)))
  const g001 = gradFast3(lmfMix(x0.add(y0).add(z1)), f.sub(vec3(0, 0, 1)))
  const g101 = gradFast3(lmfMix(x1.add(y0).add(z1)), f.sub(vec3(1, 0, 1)))
  const g011 = gradFast3(lmfMix(x0.add(y1).add(z1)), f.sub(vec3(0, 1, 1)))
  const g111 = gradFast3(lmfMix(x1.add(y1).add(z1)), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(g000, g100, ux), mix(g010, g110, ux), uy)
  const nz1 = mix(mix(g001, g101, ux), mix(g011, g111, ux), uy)
  return mix(nz0, nz1, uz)
})
`
