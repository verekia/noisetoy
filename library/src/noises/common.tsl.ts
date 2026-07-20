// Three.js TSL counterpart of common.ts. Kept function-for-function
// comparable. TSL code is stored as source strings (like the GLSL/WGSL files)
// so the same text serves rendering (evaluated against the three/tsl
// namespace) and the Copy TSL export.
//
// lowbias32 by Chris Wellons (public domain): https://nullprogram.com/blog/2018/07/31/
// Note: `uint(i32)` in WGSL (which TSL compiles to on the WebGPU backend) is a
// bit reinterpretation, matching the bitcast in common.wgsl.ts.

export const COMMON_TSL = /* js */ `
const lowbias32 = Fn(([x0]) => {
  const x = uint(x0).toVar()
  x.assign(x.bitXor(x.shiftRight(uint(16))))
  x.assign(x.mul(uint(0x7feb352d)))
  x.assign(x.bitXor(x.shiftRight(uint(15))))
  x.assign(x.mul(uint(0x846ca68b)))
  x.assign(x.bitXor(x.shiftRight(uint(16))))
  return x
})

const hash2u = Fn(([x, y]) => lowbias32(uint(x).bitXor(lowbias32(uint(y)))))

const hash3u = Fn(([x, y, z]) => lowbias32(uint(x).bitXor(lowbias32(uint(y).bitXor(lowbias32(uint(z)))))))

const hash4u = Fn(([x, y, z, w]) =>
  lowbias32(uint(x).bitXor(lowbias32(uint(y).bitXor(lowbias32(uint(z).bitXor(lowbias32(uint(w)))))))),
)

const to01 = Fn(([h]) => float(h).mul(1 / 4294967296))

const fade = Fn(([t]) => t.mul(t).mul(t).mul(t.mul(t.mul(6).sub(15)).add(10)))

const imod = Fn(([a, b]) => int(mod(float(a), float(b))))

const LATTICE_HX = uint(0x27d4eb2f)
const LATTICE_HY = uint(0x85ebca6b)
const LATTICE_HZ = uint(0xc2b2ae35)

const gradTable2 = Fn(([h, d]) => {
  const hi = uint(h).bitAnd(uint(7)).toVar()
  const u = select(hi.lessThan(uint(4)), d.x, d.y).toVar()
  const v = select(hi.lessThan(uint(4)), d.y, d.x).toVar()
  return select(hi.bitAnd(uint(1)).equal(uint(0)), u, u.negate()).add(
    select(hi.bitAnd(uint(2)).equal(uint(0)), v, v.negate()),
  )
})

const gradTable3 = Fn(([h, d]) => {
  const t = uint(h).shiftRight(uint(2)).toVar()
  const axis = select(t.lessThan(uint(357913941)), int(0), select(t.lessThan(uint(715827882)), int(1), int(2))).toVar()
  const a = select(axis.equal(int(2)), d.y, d.x).toVar()
  const b = select(axis.equal(int(0)), d.y, d.z).toVar()
  return select(uint(h).bitAnd(uint(1)).equal(uint(0)), a, a.negate()).add(
    select(uint(h).bitAnd(uint(2)).equal(uint(0)), b, b.negate()),
  )
})

const gradDot2 = Fn(([h, d]) => {
  const a = to01(h).mul(6.283185307179586)
  return dot(vec2(cos(a), sin(a)), d)
})

const gradDot3 = Fn(([h, d]) => {
  const gz = to01(h).mul(2).sub(1)
  const a = to01(lowbias32(h)).mul(6.283185307179586)
  const r = gz.mul(gz).oneMinus().max(0).sqrt()
  return dot(vec3(r.mul(cos(a)), r.mul(sin(a)), gz), d)
})
`
