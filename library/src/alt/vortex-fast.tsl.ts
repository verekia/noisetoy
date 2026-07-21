// TSL counterpart of vortex-fast.ts. Requires COMMON_TSL and
// FAST_COMMON_TSL.

export const VORTEX_FAST_TSL = /* js */ `
const vtxFastDir = Fn(([h]) => {
  const t = uint(h).shiftRight(uint(28)).bitAnd(uint(3)).toVar()
  const bx = select(
    t.equal(uint(0)),
    float(1),
    select(t.equal(uint(1)), float(0.9238795325112867), select(t.equal(uint(2)), float(0.7071067811865476), float(0.3826834323650898))),
  ).toVar()
  const by = select(
    t.equal(uint(0)),
    float(0),
    select(t.equal(uint(1)), float(0.3826834323650898), select(t.equal(uint(2)), float(0.7071067811865476), float(0.9238795325112867))),
  ).toVar()
  const q = uint(h).shiftRight(uint(30)).toVar()
  return select(
    q.equal(uint(0)),
    vec2(bx, by),
    select(q.equal(uint(1)), vec2(by.negate(), bx), select(q.equal(uint(2)), vec2(bx.negate(), by.negate()), vec2(by, bx.negate()))),
  )
})

const vortexFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const rx0 = x0.bitXor(x0.shiftRight(uint(16))).toVar()
  const rx1 = x1.bitXor(x1.shiftRight(uint(16))).toVar()
  const s = vtxFastDir(rx0.bitXor(y0).mul(ALT_FIB)).mul(ux.oneMinus().mul(uy.oneMinus())).toVar()
  s.addAssign(vtxFastDir(rx1.bitXor(y0).mul(ALT_FIB)).mul(ux.mul(uy.oneMinus())))
  s.addAssign(vtxFastDir(rx0.bitXor(y1).mul(ALT_FIB)).mul(ux.oneMinus().mul(uy)))
  s.addAssign(vtxFastDir(rx1.bitXor(y1).mul(ALT_FIB)).mul(ux.mul(uy)))
  const a = s.x.mul(s.x)
  const b = s.y.mul(s.y)
  const n = a.add(b).toVar()
  return select(n.greaterThan(0), a.sub(b).div(n), float(1))
})

const vtxFastCorner3 = Fn(([sIn]) => {
  const h = lowbias32(sIn).toVar()
  return vtxFastDir(h).mul(float(h.shiftRight(uint(18)).bitAnd(uint(1023))).mul(1 / 1024))
})

const vortexFast3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const uz = fade(f.z).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const z0 = uint(int(i.z)).mul(LATTICE_HZ).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const z1 = z0.add(LATTICE_HZ).toVar()
  const xy00 = x0.add(y0).toVar()
  const xy10 = x1.add(y0).toVar()
  const xy01 = x0.add(y1).toVar()
  const xy11 = x1.add(y1).toVar()
  const vx = ux.oneMinus().toVar()
  const vy = uy.oneMinus().toVar()
  const vz = uz.oneMinus().toVar()
  const s = vtxFastCorner3(xy00.add(z0)).mul(vx.mul(vy).mul(vz)).toVar()
  s.addAssign(vtxFastCorner3(xy10.add(z0)).mul(ux.mul(vy).mul(vz)))
  s.addAssign(vtxFastCorner3(xy01.add(z0)).mul(vx.mul(uy).mul(vz)))
  s.addAssign(vtxFastCorner3(xy11.add(z0)).mul(ux.mul(uy).mul(vz)))
  s.addAssign(vtxFastCorner3(xy00.add(z1)).mul(vx.mul(vy).mul(uz)))
  s.addAssign(vtxFastCorner3(xy10.add(z1)).mul(ux.mul(vy).mul(uz)))
  s.addAssign(vtxFastCorner3(xy01.add(z1)).mul(vx.mul(uy).mul(uz)))
  s.addAssign(vtxFastCorner3(xy11.add(z1)).mul(ux.mul(uy).mul(uz)))
  const a = s.x.mul(s.x)
  const b = s.y.mul(s.y)
  const n = a.add(b).toVar()
  return select(n.greaterThan(0), a.sub(b).div(n), float(1))
})
`
