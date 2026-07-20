// TSL counterpart of worley.ts. Requires COMMON_TSL.

export const WORLEY_TSL = /* js */ `
const worley2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
      const o = vec2(to01(h), to01(lowbias32(h)))
      const v = vec2(float(dx), float(dy)).add(o).sub(f)
      f1.assign(f1.min(dot(v, v)))
    })
  })
  return sqrt(f1)
})

const worley3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(ix.add(dx), iy.add(dy), iz.add(dz))
        const h2 = lowbias32(h)
        const o = vec3(to01(h), to01(h2), to01(lowbias32(h2)))
        const v = vec3(float(dx), float(dy), float(dz)).add(o).sub(f)
        f1.assign(f1.min(dot(v, v)))
      })
    })
  })
  return sqrt(f1)
})
`
