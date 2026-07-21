// TSL counterpart of cellular.ts (Mosaic, Crackle, Foam, Stars).
// Requires COMMON_TSL.

import { COMMON_TSL } from './common.tsl.js'
import { CRACKLE_NORM, STARS_NORM } from './normalization.js'

import type { ShaderSpec } from '../spec.js'

export const CELLULAR_TSL = /* js */ `
const mosaic2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const best = float(1e9).toVar()
  const bh = uint(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
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

const mosaic3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const best = float(1e9).toVar()
  const bh = uint(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(ix.add(dx), iy.add(dy), iz.add(dz))
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

const crackle2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
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

const crackle3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const f1 = float(1e9).toVar()
  const f2 = float(1e9).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(ix.add(dx), iy.add(dy), iz.add(dz))
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

const foam2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const m = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(lowbias32(h)))).sub(f)
      const t = float(1.21).sub(dot(v, v))
      If(t.greaterThan(0), () => {
        m.assign(m.max(sqrt(t).div(1.1)))
      })
    })
  })
  return m
})

const foam3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const m = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(ix.add(dx), iy.add(dy), iz.add(dz))
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

const stars2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
      const h = hash2u(ix.add(dx), iy.add(dy))
      const h2 = lowbias32(h)
      const v = vec2(float(dx), float(dy)).add(vec2(to01(h), to01(h2))).sub(f)
      sum.addAssign(to01(lowbias32(h2)).mul(exp(dot(v, v).mul(-18))))
    })
  })
  return sum
})

const stars3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i)
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const sum = float(0).toVar()
  Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dz }) => {
    Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dy }) => {
      Loop({ start: int(-1), end: int(1), condition: '<=' }, ({ i: dx }) => {
        const h = hash3u(ix.add(dx), iy.add(dy), iz.add(dz))
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

/** Mosaic 2D (Canonical) — TSL shader spec. */
export const mosaic2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: 'mosaic2(p)',
}

/** Mosaic 3D (Canonical) — TSL shader spec. */
export const mosaic3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: 'mosaic3(p)',
}

/** Crackle 2D (Canonical) — TSL shader spec. */
export const crackle2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: `crackle2(p).mul(${CRACKLE_NORM})`,
}

/** Crackle 3D (Canonical) — TSL shader spec. */
export const crackle3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: `crackle3(p).mul(${CRACKLE_NORM})`,
}

/** Foam 2D (Canonical) — TSL shader spec. */
export const foam2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: 'foam2(p)',
}

/** Foam 3D (Canonical) — TSL shader spec. */
export const foam3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: 'foam3(p)',
}

/** Stars 2D (Canonical) — TSL shader spec. */
export const stars2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: `stars2(p).mul(${STARS_NORM})`,
}

/** Stars 3D (Canonical) — TSL shader spec. */
export const stars3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, CELLULAR_TSL],
  expr: `stars3(p).mul(${STARS_NORM})`,
}
