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
const crackleFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  const cell = (sNode, bx, by) => {
    const h = fibMix(sNode).toVar()
    h.assign(h.bitXor(h.shiftRight(uint(16))))
    const v = vec2(bx, by).add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
    const d = dot(v, v).toVar()
    If(d.lessThan(f1), () => {
      f2.assign(f1)
      f1.assign(d)
    }).ElseIf(d.lessThan(f2), () => {
      f2.assign(d)
    })
  }
  const col = (xpart, bx) => {
    cell(xpart.add(yc), bx, f.y.negate())
    cell(xpart.add(yc.sub(LATTICE_HY)), bx, f.y.negate().sub(1))
    cell(xpart.add(yc.add(LATTICE_HY)), bx, f.y.oneMinus())
  }
  col(xc, f.x.negate())
  If(f.x.mul(f.x).lessThan(f2), () => {
    col(xc.sub(LATTICE_HX), f.x.negate().sub(1))
  })
  If(f.x.oneMinus().mul(f.x.oneMinus()).lessThan(f2), () => {
    col(xc.add(LATTICE_HX), f.x.oneMinus())
  })
  return sqrt(f2).sub(sqrt(f1))
})

const crackleFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  const cell = (sNode, bx, by, bz) => {
    const h = lowbias32(sNode).toVar()
    const v = vec3(bx, by, bz).add(
      vec3(
        float(h.shiftRight(uint(22))),
        float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
        float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
      ).mul(1 / 1024),
    )
    const d = dot(v, v).toVar()
    If(d.lessThan(f1), () => {
      f2.assign(f1)
      f1.assign(d)
    }).ElseIf(d.lessThan(f2), () => {
      f2.assign(d)
    })
  }
  const planeCells = (zpartNode, bz, zz) => {
    const colCells = (xpartNode, bx) => {
      cell(xpartNode.add(yc).add(zpartNode), bx, f.y.negate(), bz)
      cell(xpartNode.add(yc.sub(LATTICE_HY)).add(zpartNode), bx, f.y.negate().sub(1), bz)
      cell(xpartNode.add(yc.add(LATTICE_HY)).add(zpartNode), bx, f.y.oneMinus(), bz)
    }
    colCells(xc, f.x.negate())
    If(f.x.mul(f.x).add(zz).lessThan(f2), () => {
      colCells(xc.sub(LATTICE_HX), f.x.negate().sub(1))
    })
    If(f.x.oneMinus().mul(f.x.oneMinus()).add(zz).lessThan(f2), () => {
      colCells(xc.add(LATTICE_HX), f.x.oneMinus())
    })
  }
  planeCells(zc, f.z.negate(), float(0))
  If(f.z.mul(f.z).lessThan(f2), () => {
    planeCells(zc.sub(LATTICE_HZ), f.z.negate().sub(1), f.z.mul(f.z))
  })
  If(f.z.oneMinus().mul(f.z.oneMinus()).lessThan(f2), () => {
    planeCells(zc.add(LATTICE_HZ), f.z.oneMinus(), f.z.oneMinus().mul(f.z.oneMinus()))
  })
  return sqrt(f2).sub(sqrt(f1))
})
const foamFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const q = float(0).toVar()
  const cell = (sNode, bx, by) => {
    const h = fibMix(sNode).toVar()
    h.assign(h.bitXor(h.shiftRight(uint(16))))
    const v = vec2(bx, by).add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
    q.assign(max(q, float(1.21).sub(dot(v, v))))
  }
  const col = (xpart, bx) => {
    cell(xpart.add(yc), bx, f.y.negate())
    cell(xpart.add(yc.sub(LATTICE_HY)), bx, f.y.negate().sub(1))
    cell(xpart.add(yc.add(LATTICE_HY)), bx, f.y.oneMinus())
  }
  col(xc, f.x.negate())
  If(f.x.mul(f.x).lessThan(float(1.21).sub(q)), () => {
    col(xc.sub(LATTICE_HX), f.x.negate().sub(1))
  })
  If(f.x.oneMinus().mul(f.x.oneMinus()).lessThan(float(1.21).sub(q)), () => {
    col(xc.add(LATTICE_HX), f.x.oneMinus())
  })
  return select(q.greaterThan(0), sqrt(q).mul(1 / 1.1), float(0))
})

const foamFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const q = float(0).toVar()
  const cell = (sNode, bx, by, bz) => {
    const h = lowbias32(sNode).toVar()
    const v = vec3(bx, by, bz).add(
      vec3(
        float(h.shiftRight(uint(22))),
        float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
        float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
      ).mul(1 / 1024),
    )
    q.assign(max(q, float(1.21).sub(dot(v, v))))
  }
  const planeCells = (zpartNode, bz, zz) => {
    const colCells = (xpartNode, bx) => {
      cell(xpartNode.add(yc).add(zpartNode), bx, f.y.negate(), bz)
      cell(xpartNode.add(yc.sub(LATTICE_HY)).add(zpartNode), bx, f.y.negate().sub(1), bz)
      cell(xpartNode.add(yc.add(LATTICE_HY)).add(zpartNode), bx, f.y.oneMinus(), bz)
    }
    colCells(xc, f.x.negate())
    If(f.x.mul(f.x).add(zz).lessThan(float(1.21).sub(q)), () => {
      colCells(xc.sub(LATTICE_HX), f.x.negate().sub(1))
    })
    If(f.x.oneMinus().mul(f.x.oneMinus()).add(zz).lessThan(float(1.21).sub(q)), () => {
      colCells(xc.add(LATTICE_HX), f.x.oneMinus())
    })
  }
  planeCells(zc, f.z.negate(), float(0))
  If(f.z.mul(f.z).lessThan(float(1.21).sub(q)), () => {
    planeCells(zc.sub(LATTICE_HZ), f.z.negate().sub(1), f.z.mul(f.z))
  })
  If(f.z.oneMinus().mul(f.z.oneMinus()).lessThan(float(1.21).sub(q)), () => {
    planeCells(zc.add(LATTICE_HZ), f.z.oneMinus(), f.z.oneMinus().mul(f.z.oneMinus()))
  })
  return select(q.greaterThan(0), sqrt(q).mul(1 / 1.1), float(0))
})
const starsFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const sum = float(0).toVar()
  const cell = (sNode, bx, by) => {
    const h = fibMix(sNode).toVar()
    h.assign(h.bitXor(h.shiftRight(uint(16))))
    const v = vec2(bx, by).add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
    const d2 = dot(v, v).toVar()
    If(d2.lessThan(0.77), () => {
      const bh = h.bitXor(h.shiftRight(uint(15))).mul(ALT_FIB)
      sum.addAssign(float(bh.shiftRight(uint(8))).mul(1 / 16777216).mul(exp(d2.mul(-18))))
    })
  }
  const col = (xpart, bx) => {
    cell(xpart.add(yc), bx, f.y.negate())
    cell(xpart.add(yc.sub(LATTICE_HY)), bx, f.y.negate().sub(1))
    cell(xpart.add(yc.add(LATTICE_HY)), bx, f.y.oneMinus())
  }
  col(xc, f.x.negate())
  If(f.x.mul(f.x).lessThan(0.77), () => {
    col(xc.sub(LATTICE_HX), f.x.negate().sub(1))
  })
  If(f.x.oneMinus().mul(f.x.oneMinus()).lessThan(0.77), () => {
    col(xc.add(LATTICE_HX), f.x.oneMinus())
  })
  return sum
})

const starsFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const sum = float(0).toVar()
  const cell = (sNode, bx, by, bz) => {
    const h = lowbias32(sNode).toVar()
    const v = vec3(bx, by, bz).add(
      vec3(
        float(h.shiftRight(uint(22))),
        float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
        float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
      ).mul(1 / 1024),
    )
    const d2 = dot(v, v).toVar()
    If(d2.lessThan(0.77), () => {
      const bh = h.bitXor(h.shiftRight(uint(15))).mul(ALT_FIB)
      sum.addAssign(float(bh.shiftRight(uint(8))).mul(1 / 16777216).mul(exp(d2.mul(-18))))
    })
  }
  const planeCells = (zpartNode, bz, zz) => {
    const colCells = (xpartNode, bx) => {
      cell(xpartNode.add(yc).add(zpartNode), bx, f.y.negate(), bz)
      cell(xpartNode.add(yc.sub(LATTICE_HY)).add(zpartNode), bx, f.y.negate().sub(1), bz)
      cell(xpartNode.add(yc.add(LATTICE_HY)).add(zpartNode), bx, f.y.oneMinus(), bz)
    }
    colCells(xc, f.x.negate())
    If(f.x.mul(f.x).add(zz).lessThan(0.77), () => {
      colCells(xc.sub(LATTICE_HX), f.x.negate().sub(1))
    })
    If(f.x.oneMinus().mul(f.x.oneMinus()).add(zz).lessThan(0.77), () => {
      colCells(xc.add(LATTICE_HX), f.x.oneMinus())
    })
  }
  planeCells(zc, f.z.negate(), float(0))
  If(f.z.mul(f.z).lessThan(0.77), () => {
    planeCells(zc.sub(LATTICE_HZ), f.z.negate().sub(1), f.z.mul(f.z))
  })
  If(f.z.oneMinus().mul(f.z.oneMinus()).lessThan(0.77), () => {
    planeCells(zc.add(LATTICE_HZ), f.z.oneMinus(), f.z.oneMinus().mul(f.z.oneMinus()))
  })
  return sum
})
`
