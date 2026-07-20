// TSL counterpart of simplex.ts. Requires COMMON_TSL.
//
// The corner-ranking ladder is written with nested If/Else rather than the
// plain JS branches the TypeScript uses: i1..k2 are node values, not numbers,
// so the comparison has to happen in the shader graph.

export const SIMPLEX_TSL = /* js */ `
const simplex2 = Fn(([p]) => {
  const F2 = float(0.3660254037844386)
  const G2 = float(0.21132486540518713)
  const s = p.x.add(p.y).mul(F2)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const t = float(i.add(j)).mul(G2)
  const x0 = p.x.sub(float(i).sub(t)).toVar()
  const y0 = p.y.sub(float(j).sub(t)).toVar()
  const i1 = select(x0.greaterThan(y0), int(1), int(0)).toVar()
  const j1 = int(1).sub(i1).toVar()
  const x1 = x0.sub(float(i1)).add(G2).toVar()
  const y1 = y0.sub(float(j1)).add(G2).toVar()
  const x2 = x0.sub(1).add(G2.mul(2)).toVar()
  const y2 = y0.sub(1).add(G2.mul(2)).toVar()
  const hx0 = uint(i).mul(LATTICE_HX).toVar()
  const hy0 = uint(j).mul(LATTICE_HY).toVar()
  const hx1 = hx0.add(LATTICE_HX).toVar()
  const hy1 = hy0.add(LATTICE_HY).toVar()
  const n = float(0).toVar()
  const t0 = float(0.5).sub(x0.mul(x0)).sub(y0.mul(y0)).toVar()
  If(t0.greaterThan(0), () => {
    const q = t0.mul(t0).toVar()
    n.addAssign(q.mul(q).mul(gradTable2(lowbias32(hx0.add(hy0)), vec2(x0, y0))))
  })
  const t1 = float(0.5).sub(x1.mul(x1)).sub(y1.mul(y1)).toVar()
  If(t1.greaterThan(0), () => {
    const q = t1.mul(t1).toVar()
    const h = select(i1.equal(int(1)), hx1, hx0).add(select(j1.equal(int(1)), hy1, hy0))
    n.addAssign(q.mul(q).mul(gradTable2(lowbias32(h), vec2(x1, y1))))
  })
  const t2 = float(0.5).sub(x2.mul(x2)).sub(y2.mul(y2)).toVar()
  If(t2.greaterThan(0), () => {
    const q = t2.mul(t2).toVar()
    n.addAssign(q.mul(q).mul(gradTable2(lowbias32(hx1.add(hy1)), vec2(x2, y2))))
  })
  return n
})

const simplex3 = Fn(([p]) => {
  const F3 = float(0.3333333333333333)
  const G3 = float(0.16666666666666666)
  const s = p.x.add(p.y).add(p.z).mul(F3)
  const i = int(floor(p.x.add(s))).toVar()
  const j = int(floor(p.y.add(s))).toVar()
  const k = int(floor(p.z.add(s))).toVar()
  const t = float(i.add(j).add(k)).mul(G3)
  const x0 = p.x.sub(float(i).sub(t)).toVar()
  const y0 = p.y.sub(float(j).sub(t)).toVar()
  const z0 = p.z.sub(float(k).sub(t)).toVar()
  const i1 = int(0).toVar()
  const j1 = int(0).toVar()
  const k1 = int(0).toVar()
  const i2 = int(0).toVar()
  const j2 = int(0).toVar()
  const k2 = int(0).toVar()
  If(x0.greaterThanEqual(y0), () => {
    If(y0.greaterThanEqual(z0), () => {
      i1.assign(int(1)); i2.assign(int(1)); j2.assign(int(1))
    }).ElseIf(x0.greaterThanEqual(z0), () => {
      i1.assign(int(1)); i2.assign(int(1)); k2.assign(int(1))
    }).Else(() => {
      k1.assign(int(1)); i2.assign(int(1)); k2.assign(int(1))
    })
  }).Else(() => {
    If(y0.lessThan(z0), () => {
      k1.assign(int(1)); j2.assign(int(1)); k2.assign(int(1))
    }).ElseIf(x0.lessThan(z0), () => {
      j1.assign(int(1)); j2.assign(int(1)); k2.assign(int(1))
    }).Else(() => {
      j1.assign(int(1)); i2.assign(int(1)); j2.assign(int(1))
    })
  })
  const x1 = x0.sub(float(i1)).add(G3).toVar()
  const y1 = y0.sub(float(j1)).add(G3).toVar()
  const z1 = z0.sub(float(k1)).add(G3).toVar()
  const x2 = x0.sub(float(i2)).add(G3.mul(2)).toVar()
  const y2 = y0.sub(float(j2)).add(G3.mul(2)).toVar()
  const z2 = z0.sub(float(k2)).add(G3.mul(2)).toVar()
  const x3 = x0.sub(1).add(G3.mul(3)).toVar()
  const y3 = y0.sub(1).add(G3.mul(3)).toVar()
  const z3 = z0.sub(1).add(G3.mul(3)).toVar()
  const hx0 = uint(i).mul(LATTICE_HX).toVar()
  const hy0 = uint(j).mul(LATTICE_HY).toVar()
  const hz0 = uint(k).mul(LATTICE_HZ).toVar()
  const hx1 = hx0.add(LATTICE_HX).toVar()
  const hy1 = hy0.add(LATTICE_HY).toVar()
  const hz1 = hz0.add(LATTICE_HZ).toVar()
  const n = float(0).toVar()
  const t0 = float(0.5).sub(x0.mul(x0)).sub(y0.mul(y0)).sub(z0.mul(z0)).toVar()
  If(t0.greaterThan(0), () => {
    const q = t0.mul(t0).toVar()
    n.addAssign(q.mul(q).mul(gradTable3(lowbias32(hx0.add(hy0).add(hz0)), vec3(x0, y0, z0))))
  })
  const t1 = float(0.5).sub(x1.mul(x1)).sub(y1.mul(y1)).sub(z1.mul(z1)).toVar()
  If(t1.greaterThan(0), () => {
    const q = t1.mul(t1).toVar()
    const h = select(i1.equal(int(1)), hx1, hx0)
      .add(select(j1.equal(int(1)), hy1, hy0))
      .add(select(k1.equal(int(1)), hz1, hz0))
    n.addAssign(q.mul(q).mul(gradTable3(lowbias32(h), vec3(x1, y1, z1))))
  })
  const t2 = float(0.5).sub(x2.mul(x2)).sub(y2.mul(y2)).sub(z2.mul(z2)).toVar()
  If(t2.greaterThan(0), () => {
    const q = t2.mul(t2).toVar()
    const h = select(i2.equal(int(1)), hx1, hx0)
      .add(select(j2.equal(int(1)), hy1, hy0))
      .add(select(k2.equal(int(1)), hz1, hz0))
    n.addAssign(q.mul(q).mul(gradTable3(lowbias32(h), vec3(x2, y2, z2))))
  })
  const t3 = float(0.5).sub(x3.mul(x3)).sub(y3.mul(y3)).sub(z3.mul(z3)).toVar()
  If(t3.greaterThan(0), () => {
    const q = t3.mul(t3).toVar()
    n.addAssign(q.mul(q).mul(gradTable3(lowbias32(hx1.add(hy1).add(hz1)), vec3(x3, y3, z3))))
  })
  return n
})
`
