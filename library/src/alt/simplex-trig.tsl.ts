// TSL counterpart of simplex.ts. Requires COMMON_TSL.

export const SIMPLEX_TRIG_TSL = /* js */ `
const trigContrib2 = Fn(([d, h]) => {
  const t = float(0.5).sub(dot(d, d)).toVar()
  const r = float(0).toVar()
  If(t.greaterThan(0), () => {
    const t2 = t.mul(t)
    r.assign(t2.mul(t2).mul(gradDot2(h, d)))
  })
  return r
})

const trigContrib3 = Fn(([d, h]) => {
  const t = float(0.5).sub(dot(d, d)).toVar()
  const r = float(0).toVar()
  If(t.greaterThan(0), () => {
    const t2 = t.mul(t)
    r.assign(t2.mul(t2).mul(gradDot3(h, d)))
  })
  return r
})

const simplexTrig2 = Fn(([p]) => {
  const F2 = 0.3660254037844386
  const G2 = 0.21132486540518713
  const s = p.x.add(p.y).mul(F2)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const t = float(i.add(j)).mul(G2)
  const d0 = p.sub(vec2(float(i), float(j)).sub(t)).toVar()
  const i1 = select(d0.x.greaterThan(d0.y), int(1), int(0)).toVar()
  const j1 = int(1).sub(i1).toVar()
  const d1 = d0.sub(vec2(float(i1), float(j1))).add(G2)
  const d2 = d0.sub(1).add(2 * 0.21132486540518713)
  return trigContrib2(d0, hash2u(i, j))
    .add(trigContrib2(d1, hash2u(i.add(i1), j.add(j1))))
    .add(trigContrib2(d2, hash2u(i.add(1), j.add(1))))
})

const simplexTrig3 = Fn(([p]) => {
  const F3 = 1 / 3
  const G3 = 1 / 6
  const s = p.x.add(p.y).add(p.z).mul(F3)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const k = int(floor(p.z.add(s))).toVar()
  const t = float(i.add(j).add(k)).mul(G3)
  const d0 = p.sub(vec3(float(i), float(j), float(k)).sub(t)).toVar()
  const i1 = int(0).toVar()
  const j1 = int(0).toVar()
  const k1 = int(0).toVar()
  const i2 = int(0).toVar()
  const j2 = int(0).toVar()
  const k2 = int(0).toVar()
  If(d0.x.greaterThanEqual(d0.y), () => {
    If(d0.y.greaterThanEqual(d0.z), () => {
      i1.assign(1)
      i2.assign(1)
      j2.assign(1)
    })
      .ElseIf(d0.x.greaterThanEqual(d0.z), () => {
        i1.assign(1)
        i2.assign(1)
        k2.assign(1)
      })
      .Else(() => {
        k1.assign(1)
        i2.assign(1)
        k2.assign(1)
      })
  }).Else(() => {
    If(d0.y.lessThan(d0.z), () => {
      k1.assign(1)
      j2.assign(1)
      k2.assign(1)
    })
      .ElseIf(d0.x.lessThan(d0.z), () => {
        j1.assign(1)
        j2.assign(1)
        k2.assign(1)
      })
      .Else(() => {
        j1.assign(1)
        i2.assign(1)
        j2.assign(1)
      })
  })
  const d1 = d0.sub(vec3(float(i1), float(j1), float(k1))).add(1 / 6)
  const d2 = d0.sub(vec3(float(i2), float(j2), float(k2))).add(2 / 6)
  const d3 = d0.sub(1).add(3 / 6)
  return trigContrib3(d0, hash3u(i, j, k))
    .add(trigContrib3(d1, hash3u(i.add(i1), j.add(j1), k.add(k1))))
    .add(trigContrib3(d2, hash3u(i.add(i2), j.add(j2), k.add(k2))))
    .add(trigContrib3(d3, hash3u(i.add(1), j.add(1), k.add(1))))
})
`
