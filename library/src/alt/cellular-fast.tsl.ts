// TSL counterpart of cellular-fast.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL.
//
// Winner tracking cannot cross a TSL Fn boundary (parameters pass by value),
// so the cell logic here is a PLAIN JS helper evaluated while the node graph
// is built — it closes over the sampler's f1/sb vars and inlines its nodes
// directly, no Fn call involved. The JS loops below unroll at graph build
// time exactly like handwritten longhand.

export const CELLULAR_FAST_TSL = /* js */ `
const mosaicFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const f1 = float(1e9).toVar()
  const sb = uint(0).toVar()
  const cell = (sNode, bx, by) => {
    const s = sNode.toVar()
    const h = fibMix(s).toVar()
    h.assign(h.bitXor(h.shiftRight(uint(16))))
    const v = vec2(bx, by).add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
    const d = dot(v, v).toVar()
    If(d.lessThan(f1), () => {
      f1.assign(d)
      sb.assign(s)
    })
  }
  const col = (xpart, bx) => {
    cell(xpart.add(yc), bx, f.y.negate())
    cell(xpart.add(yc.sub(LATTICE_HY)), bx, f.y.negate().sub(1))
    cell(xpart.add(yc.add(LATTICE_HY)), bx, f.y.oneMinus())
  }
  col(xc, f.x.negate())
  If(f.x.mul(f.x).lessThan(f1), () => {
    col(xc.sub(LATTICE_HX), f.x.negate().sub(1))
  })
  If(f.x.oneMinus().mul(f.x.oneMinus()).lessThan(f1), () => {
    col(xc.add(LATTICE_HX), f.x.oneMinus())
  })
  return to01(lowbias32(sb))
})

const mosaicFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const f1 = float(1e9).toVar()
  const sb = uint(0).toVar()
  const cell = (sNode, bx, by, bz) => {
    const s = sNode.toVar()
    const h = lowbias32(s).toVar()
    const v = vec3(bx, by, bz).add(
      vec3(
        float(h.shiftRight(uint(22))),
        float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
        float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
      ).mul(1 / 1024),
    )
    const d = dot(v, v).toVar()
    If(d.lessThan(f1), () => {
      f1.assign(d)
      sb.assign(s)
    })
  }
  const planeCells = (zpartNode, bz, zz) => {
    const colCells = (xpartNode, bx) => {
      cell(xpartNode.add(yc).add(zpartNode), bx, f.y.negate(), bz)
      cell(xpartNode.add(yc.sub(LATTICE_HY)).add(zpartNode), bx, f.y.negate().sub(1), bz)
      cell(xpartNode.add(yc.add(LATTICE_HY)).add(zpartNode), bx, f.y.oneMinus(), bz)
    }
    colCells(xc, f.x.negate())
    If(f.x.mul(f.x).add(zz).lessThan(f1), () => {
      colCells(xc.sub(LATTICE_HX), f.x.negate().sub(1))
    })
    If(f.x.oneMinus().mul(f.x.oneMinus()).add(zz).lessThan(f1), () => {
      colCells(xc.add(LATTICE_HX), f.x.oneMinus())
    })
  }
  planeCells(zc, f.z.negate(), float(0))
  If(f.z.mul(f.z).lessThan(f1), () => {
    planeCells(zc.sub(LATTICE_HZ), f.z.negate().sub(1), f.z.mul(f.z))
  })
  If(f.z.oneMinus().mul(f.z.oneMinus()).lessThan(f1), () => {
    planeCells(zc.add(LATTICE_HZ), f.z.oneMinus(), f.z.oneMinus().mul(f.z.oneMinus()))
  })
  return to01(lowbias32(sb))
})
`
