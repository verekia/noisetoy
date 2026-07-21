// TSL counterpart of fast-common.glsl.ts. Requires COMMON_TSL.
// Note TSL's select(condition, ifTrue, ifFalse) argument order, which is the
// reverse of WGSL's.

export const FAST_COMMON_TSL = /* js */ `
const ALT_FIB = uint(0x9e3779b1)

const fibMix = Fn(([s]) => uint(s).bitXor(uint(s).shiftRight(uint(16))).mul(ALT_FIB))

const lmfMix = Fn(([s0]) => {
  const s = uint(s0).toVar()
  s.assign(s.bitXor(s.shiftRight(uint(16))))
  s.assign(s.mul(uint(0x7feb352d)))
  s.assign(s.bitXor(s.shiftRight(uint(15))))
  s.assign(s.mul(uint(0x846ca68b)))
  return s
})

const pickSD = Fn(([h, sv, dv]) => {
  const v = select(uint(h).bitAnd(uint(0x40000000)).equal(uint(0)), sv, dv).toVar()
  return select(uint(h).greaterThanEqual(uint(0x80000000)), v.negate(), v)
})

const gradFastDiag2 = Fn(([h, d]) => {
  return select(uint(h).greaterThanEqual(uint(0x80000000)), d.x.negate(), d.x).add(
    select(uint(h).bitAnd(uint(0x40000000)).equal(uint(0)), d.y, d.y.negate()),
  )
})

const gradFast3 = Fn(([h, d]) => {
  const t = uint(h).bitAnd(uint(0x3fffffff)).toVar()
  const a = select(t.lessThan(uint(715827882)), d.x, d.y).toVar()
  const b = select(t.lessThan(uint(357913941)), d.y, d.z).toVar()
  return select(uint(h).bitAnd(uint(0x40000000)).equal(uint(0)), a, a.negate()).add(
    select(uint(h).greaterThanEqual(uint(0x80000000)), b.negate(), b),
  )
})
`
