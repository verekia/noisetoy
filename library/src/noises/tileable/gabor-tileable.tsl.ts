// TSL counterpart of gabor-tileable.ts. Requires COMMON_TSL.

export const GABOR_TILEABLE_TSL = /* js */ `
const gabor2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const h2 = lowbias32(h)
      const h3 = lowbias32(h2)
      const h4 = lowbias32(h3)
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(h2))).sub(f).toVar()
      const ph = to01(h3).mul(6.283185307179586)
      const w = to01(h4).mul(2).sub(1)
      const proj = gradDot2(lowbias32(h4), v)
      sum.addAssign(w.mul(exp(dot(v, v).mul(-3.141592653589793))).mul(cos(proj.mul(12.566370614359172).add(ph))))
    })
  })
  return sum
})

const gabor3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const h3 = lowbias32(h2)
        const h4 = lowbias32(h3)
        const h5 = lowbias32(h4)
        const v = vec3(float(dx), float(dy), float(dz)).add(vec3(to01(h), to01(h2), to01(h3))).sub(f).toVar()
        const ph = to01(h4).mul(6.283185307179586)
        const w = to01(h5).mul(2).sub(1)
        const proj = gradDot3(lowbias32(h5), v)
        sum.addAssign(w.mul(exp(dot(v, v).mul(-3.141592653589793))).mul(cos(proj.mul(12.566370614359172).add(ph))))
      })
    })
  })
  return sum
})
`
