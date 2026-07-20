// CPU sampler: folds a layer stack in TypeScript with the same math the
// GLSL/WGSL/TSL composers emit, over the same domain (uv in [0, 1), y down)
// and the same time input (elapsed seconds).

import { applyBlend, TILE_REPEAT, translationVelocity, WARP_BLEND_STRENGTH, Z_SPEED } from './types'

import type { LayerConfig, RenderConfig } from './types'

const layerValue = (
  L: LayerConfig,
  lTiled: boolean,
  u: number,
  v: number,
  time: number,
  vx: number,
  vy: number,
): number => {
  const s = L.scale
  const z = L.variant.dim === 3 ? time * Z_SPEED : 0
  // Translation is applied in lattice cells, after the scale.
  const ox = vx * time
  const oy = vy * time
  const one = (freq: number): number =>
    lTiled && L.variant.sampleTileable
      ? L.variant.sampleTileable((u * s + ox) * freq, (v * s + oy) * freq, z * freq, s * freq, s * freq)
      : L.variant.sample((u * s + ox) * freq, (v * s + oy) * freq, z * freq)
  if (L.octaves === 1 && L.style === 'basic') return one(1)
  let acc = 0
  let amp = 1
  let freq = 1
  let sumAmp = 0
  let sumSq = 0
  for (let o = 0; o < L.octaves; o++) {
    const nv = one(freq)
    if (L.style === 'basic') acc += amp * (nv - 0.5)
    else if (L.style === 'billow') acc += amp * Math.abs(2 * nv - 1)
    else {
      const r = 1 - Math.abs(2 * nv - 1)
      acc += amp * r * r
    }
    sumAmp += amp
    sumSq += amp * amp
    amp *= L.gain
    freq *= 2
  }
  const n = L.style === 'basic' ? 0.5 + acc / Math.sqrt(sumSq) : acc / sumAmp
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/**
 * Builds a `(x, y, z, time) => value in [0, 1]` sampler that reads the stack in
 * 3D space rather than on a plane — the CPU counterpart of the 'position'
 * domain. Seamless on any surface; 2D-only variants fall back to the xy plane.
 */
export const createSolidSampler = (cfg: RenderConfig): ((x: number, y: number, z: number, time?: number) => number) => {
  const { layers } = cfg
  const velocities = layers.map(l => translationVelocity(l.speed, l.angle))
  return (x, y, z, time = 0) => {
    let acc = 0
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i] as LayerConfig
      const [vx, vy] = velocities[i] as [number, number]
      let px = x
      let py = y
      if (L.blend === 'warp') {
        const d = (acc - 0.5) * WARP_BLEND_STRENGTH
        px += d
        py -= d
      }
      const s = L.scale
      const ox = vx * time
      const oy = vy * time
      const oz = Z_SPEED * time
      const one = (freq: number): number =>
        L.variant.dim === 3
          ? L.variant.sample((px * s + ox) * freq, (py * s + oy) * freq, (z * s + oz) * freq)
          : L.variant.sample((px * s + ox) * freq, (py * s + oy) * freq, 0)
      let val: number
      if (L.octaves === 1 && L.style === 'basic') {
        val = one(1)
      } else {
        let sum = 0
        let amp = 1
        let freq = 1
        let sumAmp = 0
        let sumSq = 0
        for (let o = 0; o < L.octaves; o++) {
          const nv = one(freq)
          if (L.style === 'basic') sum += amp * (nv - 0.5)
          else if (L.style === 'billow') sum += amp * Math.abs(2 * nv - 1)
          else {
            const r = 1 - Math.abs(2 * nv - 1)
            sum += amp * r * r
          }
          sumAmp += amp
          sumSq += amp * amp
          amp *= L.gain
          freq *= 2
        }
        const n = L.style === 'basic' ? 0.5 + sum / Math.sqrt(sumSq) : sum / sumAmp
        val = n < 0 ? 0 : n > 1 ? 1 : n
      }
      const b = applyBlend(L.blend, acc, val)
      acc += (b - acc) * L.opacity
    }
    return acc
  }
}

/**
 * Builds a `(u, v, time) => value in [0, 1]` sampler for a layer stack. `u`/`v`
 * are normalized coordinates and `time` is elapsed seconds, which drives both
 * the z slice of 3D variants and any layer translation.
 */
export const createSampler = (cfg: RenderConfig): ((u: number, v: number, time?: number) => number) => {
  const { layers, tiled } = cfg
  const tiledFlags = layers.map(l => tiled && l.variant.sampleTileable !== null)
  const velocities = layers.map(l => translationVelocity(l.speed, l.angle))
  return (u, v, time = 0) => {
    let su = u
    let sv = v
    if (tiled) {
      su = (su * TILE_REPEAT) % 1
      sv = (sv * TILE_REPEAT) % 1
    }
    let acc = 0
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i] as LayerConfig
      let lu = su
      let lv = sv
      if (L.blend === 'warp') {
        const d = (acc - 0.5) * WARP_BLEND_STRENGTH
        lu += d
        lv -= d
      }
      const [vx, vy] = velocities[i] as [number, number]
      const val = layerValue(L, tiledFlags[i] === true, lu, lv, time, vx, vy)
      const b = applyBlend(L.blend, acc, val)
      acc += (b - acc) * L.opacity
    }
    return acc
  }
}
