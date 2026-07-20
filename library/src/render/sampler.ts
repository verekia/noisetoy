// CPU sampler: folds a layer stack in TypeScript with the same math the
// GLSL/WGSL/TSL composers emit, over the same domain (uv in [0, 1), y down)
// and the same time input (elapsed seconds).
//
// The fractal operator is classic fBm: each octave folds the noise's
// pre-clamp display value (sampleRaw) at doubled frequency plus a
// decorrelation offset, the sum is normalized variance-preserving (see
// fractalRms), and the result is clamped once at the end.

import { clamp01 } from '../noises/normalization'
import {
  applyBlend,
  FRACTAL_GAIN,
  fractalAmpSum,
  fractalRms,
  OCTAVE_OFFSET,
  OCTAVE_ROT2,
  OCTAVE_ROT3,
  RIDGE_FEEDBACK,
  TILE_REPEAT,
  translationVelocity,
  WARP_BLEND_STRENGTH,
  Z_SPEED,
} from './types'

import type { LayerConfig, RenderConfig } from './types'

const [OFF_X, OFF_Y, OFF_Z] = OCTAVE_OFFSET
const [R2A, R2B, R2C, R2D] = OCTAVE_ROT2 as [number, number, number, number]
const [R3A, R3B, R3C, R3D, R3E, R3F, R3G, R3H, R3I] = OCTAVE_ROT3 as [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/**
 * Folds `sample(octave)` through the layer's style and normalizes. The caller
 * owns how the sample position advances between octaves (offset or rotate).
 */
const foldOctaves = (L: LayerConfig, sample: (o: number) => number): number => {
  let acc = 0
  let amp = 1
  let weight = 1
  for (let o = 0; o < L.octaves; o++) {
    const nv = sample(o)
    if (L.style === 'basic') acc += amp * (nv - 0.5)
    else if (L.style === 'billow') acc += amp * Math.abs(2 * nv - 1)
    else {
      const r = Math.max(1 - Math.abs(2 * nv - 1), 0)
      const sig = r * r * weight
      acc += amp * sig
      weight = clamp01(sig * RIDGE_FEEDBACK)
    }
    amp *= FRACTAL_GAIN
  }
  return clamp01(L.style === 'basic' ? 0.5 + acc / fractalRms(L.octaves) : acc / fractalAmpSum(L.octaves))
}

/** Rotated-octave sampler over the layer's raw variant, starting at (x, y, z). */
const rotatedSampler = (L: LayerConfig, x: number, y: number, z: number): (() => number) => {
  let qx = x
  let qy = y
  let qz = z
  if (L.variant.dim === 3) {
    return () => {
      const nv = L.variant.sampleRaw(qx, qy, qz)
      const rx = R3A * qx + R3B * qy + R3C * qz
      const ry = R3D * qx + R3E * qy + R3F * qz
      const rz = R3G * qx + R3H * qy + R3I * qz
      qx = rx
      qy = ry
      qz = rz
      return nv
    }
  }
  return () => {
    const nv = L.variant.sampleRaw(qx, qy, 0)
    const rx = R2A * qx + R2B * qy
    const ry = R2C * qx + R2D * qy
    qx = rx
    qy = ry
    return nv
  }
}

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
  const one = (freq: number, o: number): number =>
    lTiled && L.variant.sampleRawTileable
      ? L.variant.sampleRawTileable(
          (u * s + ox) * freq + o * OFF_X,
          (v * s + oy) * freq + o * OFF_Y,
          z * freq + o * OFF_Z,
          s * freq,
          s * freq,
        )
      : L.variant.sampleRaw((u * s + ox) * freq + o * OFF_X, (v * s + oy) * freq + o * OFF_Y, z * freq + o * OFF_Z)
  if (L.octaves === 1 && L.style === 'basic') return clamp01(one(1, 0))
  if (L.rotate) return foldOctaves(L, rotatedSampler(L, u * s + ox, v * s + oy, z))
  let freq = 1
  return foldOctaves(L, o => {
    const nv = one(freq, o)
    freq *= 2
    return nv
  })
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
      const one = (freq: number, o: number): number =>
        L.variant.dim === 3
          ? L.variant.sampleRaw(
              (px * s + ox) * freq + o * OFF_X,
              (py * s + oy) * freq + o * OFF_Y,
              (z * s + oz) * freq + o * OFF_Z,
            )
          : L.variant.sampleRaw((px * s + ox) * freq + o * OFF_X, (py * s + oy) * freq + o * OFF_Y, 0)
      let val: number
      if (L.octaves === 1 && L.style === 'basic') {
        val = clamp01(one(1, 0))
      } else if (L.rotate) {
        val = foldOctaves(L, rotatedSampler(L, px * s + ox, py * s + oy, L.variant.dim === 3 ? z * s + oz : 0))
      } else {
        let freq = 1
        val = foldOctaves(L, o => {
          const nv = one(freq, o)
          freq *= 2
          return nv
        })
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
