// TSL counterpart of cellular-tileable.ts. Requires COMMON_TSL.

export const CELLULAR_TILEABLE_TSL = /* js */ `
const mosaic2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const best = float(1e9).toVar()
  const bh = uint(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(lowbias32(h)))).sub(f)
      const d2 = dot(v, v)
      If(d2.lessThan(best), () => {
        best.assign(d2)
        bh.assign(h)
      })
    })
  })
  return to01(lowbias32(lowbias32(bh)))
})

const mosaic3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const best = float(1e9).toVar()
  const bh = uint(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const v = vec3(float(dx), float(dy), float(dz)).add(vec3(to01(h), to01(h2), to01(lowbias32(h2)))).sub(f)
        const d2 = dot(v, v)
        If(d2.lessThan(best), () => {
          best.assign(d2)
          bh.assign(h)
        })
      })
    })
  })
  return to01(lowbias32(lowbias32(lowbias32(bh))))
})

const crackle2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(lowbias32(h)))).sub(f)
      const d2 = dot(v, v)
      If(d2.lessThan(f1), () => {
        f2.assign(f1)
        f1.assign(d2)
      }).ElseIf(d2.lessThan(f2), () => {
        f2.assign(d2)
      })
    })
  })
  return sqrt(f2).sub(sqrt(f1))
})

const crackle3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const v = vec3(float(dx), float(dy), float(dz)).add(vec3(to01(h), to01(h2), to01(lowbias32(h2)))).sub(f)
        const d2 = dot(v, v)
        If(d2.lessThan(f1), () => {
          f2.assign(f1)
          f1.assign(d2)
        }).ElseIf(d2.lessThan(f2), () => {
          f2.assign(d2)
        })
      })
    })
  })
  return sqrt(f2).sub(sqrt(f1))
})

const foam2T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const m = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(imod(ix.add(dx), px), imod(iy.add(dy), py))
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(lowbias32(h)))).sub(f)
      const t = float(1.21).sub(dot(v, v))
      If(t.greaterThan(0), () => {
        m.assign(m.max(sqrt(t).div(1.1)))
      })
    })
  })
  return m
})

const foam3T = Fn(([p, per]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const px = int(per.x).toVar()
  const py = int(per.y).toVar()
  const m = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(imod(ix.add(dx), px), imod(iy.add(dy), py), iz.add(dz))
        const h2 = lowbias32(h)
        const v = vec3(float(dx), float(dy), float(dz)).add(vec3(to01(h), to01(h2), to01(lowbias32(h2)))).sub(f)
        const t = float(1.21).sub(dot(v, v))
        If(t.greaterThan(0), () => {
          m.assign(m.max(sqrt(t).div(1.1)))
        })
      })
    })
  })
  return m
})

const stars2T = Fn(([p, per]) => {
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
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(h2))).sub(f)
      sum.addAssign(to01(lowbias32(h2)).mul(exp(dot(v, v).mul(-18))))
    })
  })
  return sum
})

const stars3T = Fn(([p, per]) => {
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
        const v = vec3(float(dx), float(dy), float(dz)).add(vec3(to01(h), to01(h2), to01(h3))).sub(f)
        sum.addAssign(to01(lowbias32(h3)).mul(exp(dot(v, v).mul(-18))))
      })
    })
  })
  return sum
})
`
