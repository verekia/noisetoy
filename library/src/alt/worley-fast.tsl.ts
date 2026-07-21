// TSL counterpart of worley-fast.ts. Requires COMMON_TSL and FAST_COMMON_TSL.
// See the GLSL file for the divergence caveat on the pruning branches.

export const WORLEY_FAST_TSL = /* js */ `
const worleyFastCell2 = Fn(([s, b, f1]) => {
  const h = fibMix(s).toVar()
  h.assign(h.bitXor(h.shiftRight(uint(16))))
  const v = b.add(vec2(float(h.shiftRight(uint(16))), float(h.bitAnd(uint(0xffff)))).mul(1 / 65536))
  return min(f1, dot(v, v))
})

const worleyFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = worleyFastCell2(xc.add(yc), vec2(f.x.negate(), f.y.negate()), float(1e9)).toVar()
  f1.assign(worleyFastCell2(xc.add(ym), vec2(f.x.negate(), f.y.negate().sub(1)), f1))
  f1.assign(worleyFastCell2(xc.add(yp), vec2(f.x.negate(), f.y.oneMinus()), f1))
  If(f.x.mul(f.x).lessThan(f1), () => {
    const xm = xc.sub(LATTICE_HX).toVar()
    f1.assign(worleyFastCell2(xm.add(yc), vec2(f.x.negate().sub(1), f.y.negate()), f1))
    f1.assign(worleyFastCell2(xm.add(ym), vec2(f.x.negate().sub(1), f.y.negate().sub(1)), f1))
    f1.assign(worleyFastCell2(xm.add(yp), vec2(f.x.negate().sub(1), f.y.oneMinus()), f1))
  })
  const gx = f.x.oneMinus().toVar()
  If(gx.mul(gx).lessThan(f1), () => {
    const xp = xc.add(LATTICE_HX).toVar()
    f1.assign(worleyFastCell2(xp.add(yc), vec2(f.x.oneMinus(), f.y.negate()), f1))
    f1.assign(worleyFastCell2(xp.add(ym), vec2(f.x.oneMinus(), f.y.negate().sub(1)), f1))
    f1.assign(worleyFastCell2(xp.add(yp), vec2(f.x.oneMinus(), f.y.oneMinus()), f1))
  })
  return sqrt(f1)
})

const worleyFastCell3 = Fn(([s, b, f1]) => {
  const h = lowbias32(s).toVar()
  const o = vec3(
    float(h.shiftRight(uint(22))),
    float(h.shiftRight(uint(12)).bitAnd(uint(1023))),
    float(h.shiftRight(uint(2)).bitAnd(uint(1023))),
  ).mul(1 / 1024)
  const v = b.add(o)
  return min(f1, dot(v, v))
})

const worleyFastPlane3 = Fn(([xc, ymz, ycz, ypz, fxy, bz, zz, f1in]) => {
  const f1 = float(f1in).toVar()
  f1.assign(worleyFastCell3(xc.add(ycz), vec3(fxy.x.negate(), fxy.y.negate(), bz), f1))
  f1.assign(worleyFastCell3(xc.add(ymz), vec3(fxy.x.negate(), fxy.y.negate().sub(1), bz), f1))
  f1.assign(worleyFastCell3(xc.add(ypz), vec3(fxy.x.negate(), fxy.y.oneMinus(), bz), f1))
  If(fxy.x.mul(fxy.x).add(zz).lessThan(f1), () => {
    const xm = uint(xc).sub(LATTICE_HX).toVar()
    f1.assign(worleyFastCell3(xm.add(ycz), vec3(fxy.x.negate().sub(1), fxy.y.negate(), bz), f1))
    f1.assign(worleyFastCell3(xm.add(ymz), vec3(fxy.x.negate().sub(1), fxy.y.negate().sub(1), bz), f1))
    f1.assign(worleyFastCell3(xm.add(ypz), vec3(fxy.x.negate().sub(1), fxy.y.oneMinus(), bz), f1))
  })
  const gx = fxy.x.oneMinus().toVar()
  If(gx.mul(gx).add(zz).lessThan(f1), () => {
    const xp = uint(xc).add(LATTICE_HX).toVar()
    f1.assign(worleyFastCell3(xp.add(ycz), vec3(fxy.x.oneMinus(), fxy.y.negate(), bz), f1))
    f1.assign(worleyFastCell3(xp.add(ymz), vec3(fxy.x.oneMinus(), fxy.y.negate().sub(1), bz), f1))
    f1.assign(worleyFastCell3(xp.add(ypz), vec3(fxy.x.oneMinus(), fxy.y.oneMinus(), bz), f1))
  })
  return f1
})

const worleyFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const xc = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const yc = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const zc = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const ym = yc.sub(LATTICE_HY).toVar()
  const yp = yc.add(LATTICE_HY).toVar()
  const f1 = worleyFastPlane3(
    xc, ym.add(zc), yc.add(zc), yp.add(zc), f.xy, f.z.negate(), float(0), float(1e9),
  ).toVar()
  const zzm = f.z.mul(f.z).toVar()
  If(zzm.lessThan(f1), () => {
    const zm = zc.sub(LATTICE_HZ).toVar()
    f1.assign(worleyFastPlane3(xc, ym.add(zm), yc.add(zm), yp.add(zm), f.xy, f.z.negate().sub(1), zzm, f1))
  })
  const gz = f.z.oneMinus().toVar()
  const zzp = gz.mul(gz).toVar()
  If(zzp.lessThan(f1), () => {
    const zp = zc.add(LATTICE_HZ).toVar()
    f1.assign(worleyFastPlane3(xc, ym.add(zp), yc.add(zp), yp.add(zp), f.xy, f.z.oneMinus(), zzp, f1))
  })
  return sqrt(f1)
})
`
