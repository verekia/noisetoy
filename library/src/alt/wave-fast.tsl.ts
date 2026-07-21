// TSL counterpart of wave-fast.ts. Requires COMMON_TSL and FAST_COMMON_TSL.
// See the GLSL file for the quantized-angle note.

export const WAVE_FAST_TSL = /* js */ `
const wavFastCorner2 = Fn(([s0, d]) => {
  const h = fibMix(s0).toVar()
  h.assign(h.bitXor(h.shiftRight(uint(16))))
  const a = float(h.shiftRight(uint(26))).mul(0.09817477042468103).toVar()
  const ph = float(h.shiftRight(uint(18)).bitAnd(uint(255))).mul(0.02454369260617026)
  return cos(dot(vec2(cos(a), sin(a)), d).mul(12.566370614359172).add(ph))
})

const wavFastCorner3 = Fn(([s, d]) => {
  const h = lowbias32(s).toVar()
  const kz = float(h.shiftRight(uint(22))).mul(1 / 512).sub(1).toVar()
  const a = float(h.shiftRight(uint(16)).bitAnd(uint(63))).mul(0.09817477042468103).toVar()
  const ph = float(h.shiftRight(uint(8)).bitAnd(uint(255))).mul(0.02454369260617026)
  const r = sqrt(kz.mul(kz).oneMinus()).toVar()
  return cos(dot(vec3(r.mul(cos(a)), r.mul(sin(a)), kz), d).mul(12.566370614359172).add(ph))
})

const waveFast2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ux = fade(f.x).toVar()
  const uy = fade(f.y).toVar()
  const x0 = uint(int(i.x)).mul(LATTICE_HX).toVar()
  const y0 = uint(int(i.y)).mul(LATTICE_HY).toVar()
  const x1 = x0.add(LATTICE_HX).toVar()
  const y1 = y0.add(LATTICE_HY).toVar()
  const s00 = wavFastCorner2(x0.add(y0), f)
  const s10 = wavFastCorner2(x1.add(y0), f.sub(vec2(1, 0)))
  const s01 = wavFastCorner2(x0.add(y1), f.sub(vec2(0, 1)))
  const s11 = wavFastCorner2(x1.add(y1), f.sub(vec2(1, 1)))
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy)
})

const waveFast3 = Fn(([p]) => {
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
  const s000 = wavFastCorner3(x0.add(y0).add(z0), f)
  const s100 = wavFastCorner3(x1.add(y0).add(z0), f.sub(vec3(1, 0, 0)))
  const s010 = wavFastCorner3(x0.add(y1).add(z0), f.sub(vec3(0, 1, 0)))
  const s110 = wavFastCorner3(x1.add(y1).add(z0), f.sub(vec3(1, 1, 0)))
  const s001 = wavFastCorner3(x0.add(y0).add(z1), f.sub(vec3(0, 0, 1)))
  const s101 = wavFastCorner3(x1.add(y0).add(z1), f.sub(vec3(1, 0, 1)))
  const s011 = wavFastCorner3(x0.add(y1).add(z1), f.sub(vec3(0, 1, 1)))
  const s111 = wavFastCorner3(x1.add(y1).add(z1), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy)
  const nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy)
  return mix(nz0, nz1, uz)
})
`
