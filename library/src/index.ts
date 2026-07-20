// noisetoy — noise functions with TypeScript / GLSL / WGSL / TSL parity, and a
// layer compositor that emits any of them from one description.
//
// Engine-agnostic entry point. Three.js helpers live in `noisetoy/three`.

export { createEffect } from './effect'
export {
  calibratedVariantIds,
  costTier,
  estimateCost,
  MEASURED_COST,
  MS_PER_UNIT_PER_MEGAPIXEL,
  noiseCost,
  TIER_LABEL,
  TIER_LIMITS,
  VARIANT_COST,
  variantCost,
} from './cost'
export type { CostEstimate, CostTier } from './cost'
export type { Effect, EffectSpec, LayerSpec } from './effect'

export { defaultVariant, getNoise, getVariant, NOISES } from './registry'
export type { Backend, NoiseDef, NoiseVariant, SampleFn, SampleTileableFn, ShaderSpec } from './registry'

// NOTE: the implementation inventory is deliberately NOT re-exported here. It
// is reference material for benchmarking, and alternative implementations are
// code that a consumer has no reason to ship. Both live behind
// `noisetoy/implementations`, which this entry never imports.

export {
  applyBlend,
  BLEND_MODES,
  DISPLACEMENT,
  PLANE_SEGMENTS,
  TILE_REPEAT,
  translationVelocity,
  WARP_BLEND_STRENGTH,
  Z_SPEED,
} from './render/types'
export type { BlendMode, FractalStyle, LayerConfig, RenderConfig, Renderer, ViewMode } from './render/types'

// Lower-level composers, for callers that build their own RenderConfig.
export { buildGlslFragment } from './render/glsl'
export { createSampler } from './render/sampler'
export { buildTslBody, buildTslModule, TSL_IMPORTS } from './render/tsl'
export { buildWgslShader } from './render/wgsl'

// Shared shader chunks, if you want to compose sources by hand.
export { COMMON_GLSL } from './noises/common.glsl'
export { COMMON_TSL } from './noises/common.tsl'
export { COMMON_WGSL } from './noises/common.wgsl'

// CPU primitives, for sampling noises directly without an effect.
export { fade, gradDot2, gradDot3, hash2, hash3, hash4, hashU32, imod, lerp, to01 } from './noises/common'
