// The public composition API: a declarative layer stack that can be sampled on
// the CPU or emitted as GLSL, WGSL, or TSL — all from one description, over
// one shared domain.

import { estimateCost } from './cost'
import { defaultVariant, getNoise, getVariant, NOISES } from './registry'
import { buildGlslFragment } from './render/glsl'
import { createSampler, createSolidSampler } from './render/sampler'
import { buildTslBody, buildTslModule } from './render/tsl'
import { BLEND_MODES } from './render/types'
import { buildWgslShader } from './render/wgsl'

import type { CostEstimate } from './cost'
import type { NoiseDef, NoiseVariant } from './registry'
import type { BlendMode, FractalStyle, LayerConfig, SampleDomain } from './render/types'

/** One layer of an effect. Only `noise` is required. */
export type LayerSpec = {
  /** Noise id, e.g. 'perlin' (see `NOISES`). */
  noise: string
  /** Variant id, e.g. 'perlin-2d'. Takes precedence over `dim`. */
  variant?: string
  /** Convenience selector: pick the 2D or 3D variant. Defaults to 3D when available. */
  dim?: 2 | 3
  /**
   * Fractal octaves, 1-6 — classic fBm: lacunarity 2, gain 0.5,
   * variance-preserving normalization. Default 1. Capped at 6 because at gain
   * 0.5 the seventh octave's contribution falls below one 8-bit display level
   * (and below the pixel grid at the default scale), while cost stays linear
   * in octaves — the cap is where the last just-visible octave sits.
   */
  octaves?: number
  /**
   * Rotate each octave instead of offsetting it — the classic shader-fBm
   * construction (iq's rotation matrices, lacunarity 2.02). Stronger octave
   * decorrelation than the default offsets, at the price of tiling: a rotated
   * field has no period, so a rotated layer makes the stack non-tileable.
   * No effect at 1 octave. Default false.
   */
  rotate?: boolean
  /** Per-octave shaping. Default 'basic'. */
  style?: FractalStyle
  /** Multiplies the noise's base lattice scale (finer detail above 1). Default 1. */
  scale?: number
  /** How this layer combines with the layers below. Ignored on the first layer. Default 'normal'. */
  blend?: BlendMode
  /** 0-1. Default 1. */
  opacity?: number
  /** Translation speed in lattice cells per second. Default 0 (no translation). */
  speed?: number
  /** Translation heading in degrees: 0 is right, 90 is up. Default 0. */
  angle?: number
}

export type EffectSpec = {
  layers: LayerSpec[]
  /**
   * Where the stack is sampled: 'uv' (default) on a plane, or 'position' in 3D
   * space. Use 'position' for spheres and other closed surfaces — it has no uv
   * seam and no pole pinching. Tiling does not apply to 'position'.
   */
  domain?: SampleDomain
  /**
   * Repeat one tile in a grid through the tileable code paths. Only
   * possible when every layer's variant is tileable (see `isTileable`).
   */
  tiled?: boolean
}

export type Effect = {
  readonly spec: Required<EffectSpec>
  /** Resolved per-layer render config (variants, absolute scales). */
  readonly layers: LayerConfig[]
  readonly tiled: boolean
  /** True when every layer has a tileable code path. */
  readonly tileable: boolean
  /**
   * Samples the stack on the CPU. `u`/`v` are normalized; `time` is elapsed
   * seconds and drives both the z slice of 3D variants and layer translation.
   */
  sample: (u: number, v: number, time?: number) => number
  /**
   * Samples the stack at a point in 3D space. Seamless on any surface: pass a
   * position (for a unit sphere, its surface point) instead of a uv.
   */
  sampleAt: (x: number, y: number, z: number, time?: number) => number
  readonly domain: SampleDomain
  /** Complete GLSL ES 3.00 fragment shader (uniforms: `u_res`, `u_t`). */
  glsl: () => string
  /** Complete WGSL module with `vs`/`fs` entry points (uniforms: res, t). */
  wgsl: () => string
  /** Standalone TSL module source exporting an `effect(uv, time)` function. */
  tsl: () => string
  /** TSL source without the import header, for embedding or evaluation. */
  tslBody: () => string
  /** Static cost estimate for this stack; see cost.ts for the calibration. */
  cost: () => CostEstimate
  toJSON: () => Required<EffectSpec>
}

const STYLES: FractalStyle[] = ['basic', 'billow', 'ridged']

const resolveVariant = (noise: NoiseDef, spec: LayerSpec): NoiseVariant => {
  if (spec.variant) return getVariant(noise, spec.variant)
  if (spec.dim) return noise.variants.find(v => v.dim === spec.dim) ?? defaultVariant(noise)
  return defaultVariant(noise)
}

const normalizeLayer = (spec: LayerSpec, index: number): Required<LayerSpec> => {
  const noise = getNoise(spec.noise)
  if (!noise) throw new Error(`Unknown noise "${spec.noise}". Known ids: ${NOISES.map(n => n.id).join(', ')}`)
  const variant = resolveVariant(noise, spec)
  const octaves = Math.min(6, Math.max(1, Math.round(spec.octaves ?? 1)))
  const rotate = Boolean(spec.rotate)
  const style = spec.style && STYLES.includes(spec.style) ? spec.style : 'basic'
  const blend =
    index === 0
      ? 'normal'
      : ((spec.blend && BLEND_MODES.some(m => m.id === spec.blend) ? spec.blend : 'normal') as BlendMode)
  const opacity = Math.min(1, Math.max(0, spec.opacity ?? 1))
  const scale = spec.scale && spec.scale > 0 ? spec.scale : 1
  const speed = Number.isFinite(spec.speed) ? Math.max(0, spec.speed as number) : 0
  const angle = Number.isFinite(spec.angle) ? (((spec.angle as number) % 360) + 360) % 360 : 0
  return {
    noise: noise.id,
    variant: variant.id,
    dim: variant.dim,
    octaves,
    rotate,
    style,
    scale,
    blend,
    opacity,
    speed,
    angle,
  }
}

/**
 * Creates an effect from a declarative spec.
 *
 * ```ts
 * const effect = createEffect({
 *   layers: [
 *     { noise: 'perlin', octaves: 5 },
 *     { noise: 'worley', style: 'ridged', blend: 'multiply', opacity: 0.6 },
 *   ],
 * })
 * effect.sample(0.5, 0.5)  // -> 0..1
 * effect.wgsl()            // -> shader source
 * ```
 */
export const createEffect = (spec: EffectSpec): Effect => {
  if (!spec.layers || spec.layers.length === 0) throw new Error('An effect needs at least one layer')
  const normalized = spec.layers.map(normalizeLayer)
  const tileable = normalized.every(l => {
    const noise = getNoise(l.noise) as NoiseDef
    // Rotated octaves have no period; rotate is inert at 1 octave.
    return getVariant(noise, l.variant).sampleTileable !== null && !(l.rotate && l.octaves > 1)
  })
  const tiled = Boolean(spec.tiled) && tileable

  const layers: LayerConfig[] = normalized.map(l => {
    const noise = getNoise(l.noise) as NoiseDef
    // The tiling period must stay a whole number of lattice cells.
    const raw = noise.scale * l.scale
    return {
      variant: getVariant(noise, l.variant),
      scale: tiled ? Math.max(1, Math.round(raw)) : raw,
      octaves: l.octaves,
      rotate: l.rotate,
      style: l.style,
      blend: l.blend,
      opacity: l.opacity,
      speed: l.speed,
      angle: l.angle,
    }
  })

  const domain: SampleDomain = spec.domain === 'position' ? 'position' : 'uv'
  const cfg = { layers, tiled, size: 1, domain }
  const resolvedSpec: Required<EffectSpec> = { layers: normalized, tiled, domain }

  return {
    spec: resolvedSpec,
    layers,
    tiled,
    tileable,
    domain,
    sample: createSampler(cfg),
    sampleAt: createSolidSampler(cfg),
    glsl: () => buildGlslFragment(cfg),
    wgsl: () => buildWgslShader(cfg),
    tsl: () => buildTslModule(cfg),
    tslBody: () => buildTslBody(cfg),
    cost: () => estimateCost(layers),
    toJSON: () => resolvedSpec,
  }
}
