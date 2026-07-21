// TSL counterpart of worley-metrics-fast.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL. See the GLSL file for the metric-specific prune bounds.

import { COMMON_TSL } from '../noises/common.tsl.js'
import { CHEBYSHEV2_NORM, CHEBYSHEV3_NORM, MANHATTAN2_NORM, MANHATTAN3_NORM } from '../noises/normalization.js'
import { FAST_COMMON_TSL } from './fast-common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_METRICS_FAST_TSL = /* js */ `
const wmFastOffsets2 = Fn(([s]) => {
  const h = fibMix(s).toVar()
  h.assign(h.bitXor(h.shiftRight(uint(16))))
  return vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536)
})

const wmFastOffsets3 = Fn(([s]) => {
  const h = lowbias32(s).toVar()
  return vec3(
    float(h.shiftRight(uint(22))),
    float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
    float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
  ).mul(1 / 1024)
})

const mFastCell2 = Fn(([s, b, f1]) => {
  const v = abs(b.add(wmFastOffsets2(s)))
  return min(f1, v.x.add(v.y))
})

const cFastCell2 = Fn(([s, b, f1]) => {
  const v = abs(b.add(wmFastOffsets2(s)))
  return min(f1, max(v.x, v.y))
})

const mFastCell3 = Fn(([s, b, f1]) => {
  const v = abs(b.add(wmFastOffsets3(s)))
  return min(f1, v.x.add(v.y).add(v.z))
})

const cFastCell3 = Fn(([s, b, f1]) => {
  const v = abs(b.add(wmFastOffsets3(s)))
  return min(f1, max(v.x, max(v.y, v.z)))
})

const mFastRow2 = Fn(([xpart, yc, ym, yp, bx, f, f1in]) => {
  const f1 = float(f1in).toVar()
  f1.assign(mFastCell2(xpart.add(yc), vec2(bx, f.y.negate()), f1))
  f1.assign(mFastCell2(xpart.add(ym), vec2(bx, f.y.negate().sub(1)), f1))
  f1.assign(mFastCell2(xpart.add(yp), vec2(bx, f.y.oneMinus()), f1))
  return f1
})

const cFastRow2 = Fn(([xpart, yc, ym, yp, bx, f, f1in]) => {
  const f1 = float(f1in).toVar()
  f1.assign(cFastCell2(xpart.add(yc), vec2(bx, f.y.negate()), f1))
  f1.assign(cFastCell2(xpart.add(ym), vec2(bx, f.y.negate().sub(1)), f1))
  f1.assign(cFastCell2(xpart.add(yp), vec2(bx, f.y.oneMinus()), f1))
  return f1
})

const manhattanFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = mFastRow2(xc, yc, ym, yp, f.x.negate(), f, float(1e9)).toVar()
  If(f.x.lessThan(f1), () => {
    f1.assign(mFastRow2(xc.sub(LATTICE_HX), yc, ym, yp, f.x.negate().sub(1), f, f1))
  })
  If(f.x.oneMinus().lessThan(f1), () => {
    f1.assign(mFastRow2(xc.add(LATTICE_HX), yc, ym, yp, f.x.oneMinus(), f, f1))
  })
  return f1
})

const chebyshevFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = cFastRow2(xc, yc, ym, yp, f.x.negate(), f, float(1e9)).toVar()
  If(f.x.lessThan(f1), () => {
    f1.assign(cFastRow2(xc.sub(LATTICE_HX), yc, ym, yp, f.x.negate().sub(1), f, f1))
  })
  If(f.x.oneMinus().lessThan(f1), () => {
    f1.assign(cFastRow2(xc.add(LATTICE_HX), yc, ym, yp, f.x.oneMinus(), f, f1))
  })
  return f1
})

const mFastPlane3 = Fn(([xc, ymz, ycz, ypz, fxy, bz, zclear, f1in]) => {
  const f1 = float(f1in).toVar()
  f1.assign(mFastCell3(xc.add(ycz), vec3(fxy.x.negate(), fxy.y.negate(), bz), f1))
  f1.assign(mFastCell3(xc.add(ymz), vec3(fxy.x.negate(), fxy.y.negate().sub(1), bz), f1))
  f1.assign(mFastCell3(xc.add(ypz), vec3(fxy.x.negate(), fxy.y.oneMinus(), bz), f1))
  If(fxy.x.add(zclear).lessThan(f1), () => {
    const xm = uint(xc).sub(LATTICE_HX).toVar()
    f1.assign(mFastCell3(xm.add(ycz), vec3(fxy.x.negate().sub(1), fxy.y.negate(), bz), f1))
    f1.assign(mFastCell3(xm.add(ymz), vec3(fxy.x.negate().sub(1), fxy.y.negate().sub(1), bz), f1))
    f1.assign(mFastCell3(xm.add(ypz), vec3(fxy.x.negate().sub(1), fxy.y.oneMinus(), bz), f1))
  })
  If(fxy.x.oneMinus().add(zclear).lessThan(f1), () => {
    const xp = uint(xc).add(LATTICE_HX).toVar()
    f1.assign(mFastCell3(xp.add(ycz), vec3(fxy.x.oneMinus(), fxy.y.negate(), bz), f1))
    f1.assign(mFastCell3(xp.add(ymz), vec3(fxy.x.oneMinus(), fxy.y.negate().sub(1), bz), f1))
    f1.assign(mFastCell3(xp.add(ypz), vec3(fxy.x.oneMinus(), fxy.y.oneMinus(), bz), f1))
  })
  return f1
})

const cFastPlane3 = Fn(([xc, ymz, ycz, ypz, fxy, bz, zclear, f1in]) => {
  const f1 = float(f1in).toVar()
  f1.assign(cFastCell3(xc.add(ycz), vec3(fxy.x.negate(), fxy.y.negate(), bz), f1))
  f1.assign(cFastCell3(xc.add(ymz), vec3(fxy.x.negate(), fxy.y.negate().sub(1), bz), f1))
  f1.assign(cFastCell3(xc.add(ypz), vec3(fxy.x.negate(), fxy.y.oneMinus(), bz), f1))
  If(max(fxy.x, zclear).lessThan(f1), () => {
    const xm = uint(xc).sub(LATTICE_HX).toVar()
    f1.assign(cFastCell3(xm.add(ycz), vec3(fxy.x.negate().sub(1), fxy.y.negate(), bz), f1))
    f1.assign(cFastCell3(xm.add(ymz), vec3(fxy.x.negate().sub(1), fxy.y.negate().sub(1), bz), f1))
    f1.assign(cFastCell3(xm.add(ypz), vec3(fxy.x.negate().sub(1), fxy.y.oneMinus(), bz), f1))
  })
  If(max(fxy.x.oneMinus(), zclear).lessThan(f1), () => {
    const xp = uint(xc).add(LATTICE_HX).toVar()
    f1.assign(cFastCell3(xp.add(ycz), vec3(fxy.x.oneMinus(), fxy.y.negate(), bz), f1))
    f1.assign(cFastCell3(xp.add(ymz), vec3(fxy.x.oneMinus(), fxy.y.negate().sub(1), bz), f1))
    f1.assign(cFastCell3(xp.add(ypz), vec3(fxy.x.oneMinus(), fxy.y.oneMinus(), bz), f1))
  })
  return f1
})

const manhattanFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = mFastPlane3(xc, ym.add(zc), yc.add(zc), yp.add(zc), f.xy, f.z.negate(), float(0), float(1e9)).toVar()
  If(f.z.lessThan(f1), () => {
    const zm = zc.sub(LATTICE_HZ).toVar()
    f1.assign(mFastPlane3(xc, ym.add(zm), yc.add(zm), yp.add(zm), f.xy, f.z.negate().sub(1), f.z, f1))
  })
  If(f.z.oneMinus().lessThan(f1), () => {
    const zp = zc.add(LATTICE_HZ).toVar()
    f1.assign(mFastPlane3(xc, ym.add(zp), yc.add(zp), yp.add(zp), f.xy, f.z.oneMinus(), f.z.oneMinus(), f1))
  })
  return f1
})

const chebyshevFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = cFastPlane3(xc, ym.add(zc), yc.add(zc), yp.add(zc), f.xy, f.z.negate(), float(0), float(1e9)).toVar()
  If(f.z.lessThan(f1), () => {
    const zm = zc.sub(LATTICE_HZ).toVar()
    f1.assign(cFastPlane3(xc, ym.add(zm), yc.add(zm), yp.add(zm), f.xy, f.z.negate().sub(1), f.z, f1))
  })
  If(f.z.oneMinus().lessThan(f1), () => {
    const zp = zc.add(LATTICE_HZ).toVar()
    f1.assign(cFastPlane3(xc, ym.add(zp), yc.add(zp), yp.add(zp), f.xy, f.z.oneMinus(), f.z.oneMinus(), f1))
  })
  return f1
})
`

/** Worley (Manhattan) 2D Fast (split-bits-pruned candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const worleyManhattan2dFastTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, WORLEY_METRICS_FAST_TSL],
  expr: `manhattanFast2(p).mul(${MANHATTAN2_NORM})`,
}

/** Worley (Manhattan) 3D Fast (split-bits-pruned candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const worleyManhattan3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, WORLEY_METRICS_FAST_TSL],
  expr: `manhattanFast3(p).mul(${MANHATTAN3_NORM})`,
}

/** Worley (Chebyshev) 2D Fast (split-bits-pruned candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const worleyChebyshev2dFastTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, FAST_COMMON_TSL, WORLEY_METRICS_FAST_TSL],
  expr: `chebyshevFast2(p).mul(${CHEBYSHEV2_NORM})`,
}

/** Worley (Chebyshev) 3D Fast (split-bits-pruned candidate) — TSL ShaderSpec, pre-clamp display expression. */
export const worleyChebyshev3dFastTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, FAST_COMMON_TSL, WORLEY_METRICS_FAST_TSL],
  expr: `chebyshevFast3(p).mul(${CHEBYSHEV3_NORM})`,
}
