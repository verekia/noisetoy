// TSL counterpart of wave.ts. Requires COMMON_TSL.

import { COMMON_TSL } from './common.tsl.js'

import type { ShaderSpec } from '../spec.js'

export const WAVE_TSL = /* js */ `
const waveCorner2 = Fn(([h, d]) => {
  const a = to01(h).mul(6.283185307179586)
  const ph = to01(lowbias32(h)).mul(6.283185307179586)
  return cos(dot(vec2(cos(a), sin(a)), d).mul(12.566370614359172).add(ph))
})

const waveCorner3 = Fn(([h, d]) => {
  const kz = to01(h).mul(2).sub(1)
  const h2 = lowbias32(h)
  const a = to01(h2).mul(6.283185307179586)
  const ph = to01(lowbias32(h2)).mul(6.283185307179586)
  const r = kz.mul(kz).oneMinus().max(0).sqrt()
  return cos(dot(vec3(r.mul(cos(a)), r.mul(sin(a)), kz), d).mul(12.566370614359172).add(ph))
})

const wave2 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const s00 = waveCorner2(hash2u(ix, iy), f)
  const s10 = waveCorner2(hash2u(ix.add(1), iy), f.sub(vec2(1, 0)))
  const s01 = waveCorner2(hash2u(ix, iy.add(1)), f.sub(vec2(0, 1)))
  const s11 = waveCorner2(hash2u(ix.add(1), iy.add(1)), f.sub(vec2(1, 1)))
  return mix(mix(s00, s10, ux), mix(s01, s11, ux), uy)
})

const wave3 = Fn(([p]) => {
  const i = floor(p)
  const f = p.sub(i).toVar()
  const ix = int(i.x).toVar()
  const iy = int(i.y).toVar()
  const iz = int(i.z).toVar()
  const ux = fade(f.x)
  const uy = fade(f.y)
  const uz = fade(f.z)
  const s000 = waveCorner3(hash3u(ix, iy, iz), f)
  const s100 = waveCorner3(hash3u(ix.add(1), iy, iz), f.sub(vec3(1, 0, 0)))
  const s010 = waveCorner3(hash3u(ix, iy.add(1), iz), f.sub(vec3(0, 1, 0)))
  const s110 = waveCorner3(hash3u(ix.add(1), iy.add(1), iz), f.sub(vec3(1, 1, 0)))
  const s001 = waveCorner3(hash3u(ix, iy, iz.add(1)), f.sub(vec3(0, 0, 1)))
  const s101 = waveCorner3(hash3u(ix.add(1), iy, iz.add(1)), f.sub(vec3(1, 0, 1)))
  const s011 = waveCorner3(hash3u(ix, iy.add(1), iz.add(1)), f.sub(vec3(0, 1, 1)))
  const s111 = waveCorner3(hash3u(ix.add(1), iy.add(1), iz.add(1)), f.sub(vec3(1, 1, 1)))
  const nz0 = mix(mix(s000, s100, ux), mix(s010, s110, ux), uy)
  const nz1 = mix(mix(s001, s101, ux), mix(s011, s111, ux), uy)
  return mix(nz0, nz1, uz)
})
`

/** Wave 2D (Canonical) — TSL shader spec. */
export const wave2dCanonicalTsl: ShaderSpec = {
  dim: 2,
  deps: [COMMON_TSL, WAVE_TSL],
  expr: 'wave2(p).mul(0.5).add(0.5)',
}

/** Wave 3D (Canonical) — TSL shader spec. */
export const wave3dCanonicalTsl: ShaderSpec = {
  dim: 3,
  deps: [COMMON_TSL, WAVE_TSL],
  expr: 'wave3(p).mul(0.5).add(0.5)',
}
