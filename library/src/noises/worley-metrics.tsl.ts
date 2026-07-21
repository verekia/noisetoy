// TSL counterpart of worley-metrics.ts. Requires COMMON_TSL.

import { COMMON_TSL } from './common.tsl.js'
import { CHEBYSHEV2_NORM, CHEBYSHEV3_NORM, MANHATTAN2_NORM, MANHATTAN3_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const WORLEY_METRICS_TSL = /* js */ `
const manhattan2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
      const o = vec2(to01(h), to01(lowbias32(h)))
      const v = abs(vec2(float(dx), float(dy)).add(o).sub(f)).toVar()
      f1.assign(f1.min(v.x.add(v.y)))
    })
  })
  return f1
})

const manhattan3 = Fn(([p]) => {
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
        const v = abs(vec3(float(dx), float(dy), float(dz)).add(o).sub(f)).toVar()
        f1.assign(f1.min(v.x.add(v.y).add(v.z)))
      })
    })
  })
  return f1
})

const chebyshev2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const f1 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
      const o = vec2(to01(h), to01(lowbias32(h)))
      const v = abs(vec2(float(dx), float(dy)).add(o).sub(f)).toVar()
      f1.assign(f1.min(v.x.max(v.y)))
    })
  })
  return f1
})

const chebyshev3 = Fn(([p]) => {
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
        const v = abs(vec3(float(dx), float(dy), float(dz)).add(o).sub(f)).toVar()
        f1.assign(f1.min(v.x.max(v.y).max(v.z)))
      })
    })
  })
  return f1
})
`

/** Worley (Manhattan) 2D (Canonical) — TSL shader spec. */
export const worleyManhattan2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WORLEY_METRICS_TSL],
  expr: `manhattan2(p).mul(${MANHATTAN2_NORM})`,
}

/** Worley (Manhattan) 3D (Canonical) — TSL shader spec. */
export const worleyManhattan3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WORLEY_METRICS_TSL],
  expr: `manhattan3(p).mul(${MANHATTAN3_NORM})`,
}

/** Worley (Chebyshev) 2D (Canonical) — TSL shader spec. */
export const worleyChebyshev2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WORLEY_METRICS_TSL],
  expr: `chebyshev2(p).mul(${CHEBYSHEV2_NORM})`,
}

/** Worley (Chebyshev) 3D (Canonical) — TSL shader spec. */
export const worleyChebyshev3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WORLEY_METRICS_TSL],
  expr: `chebyshev3(p).mul(${CHEBYSHEV3_NORM})`,
}
