// noisetoy — noise functions with TypeScript / GLSL / WGSL / TSL parity.
//
// Every noise variant is exported per backend so consumers bundle only what
// they import: `worley3dCanonical` is the CPU sampler of the shipping Worley
// 3D, `worley3dCanonicalWgsl` its WGSL spec, `worley3dFast` the CPU sampler
// of its faster alternative implementation, and so on. The qualifier after
// the dimension names the implementation ('Canonical' = reference, 'Fast' =
// cheaper alternative); unqualified aliases will land once a winner is
// picked per noise.
//
// The package ships individual functions only — composition (layer stacks,
// fBm, blends) is left to the consumer; `composeGlsl` / `composeWgsl` /
// `composeTsl` and the `*NoiseFn` wrappers cover combining specs into one
// shader without duplicating shared chunks.

// Shared shapes and spec composition helpers.
export { composeGlsl, composeTsl, composeWgsl, glslNoiseFn, TSL_IMPORTS, tslNoiseFn, wgslNoiseFn } from './spec.js'
export type { NoiseSource, Sample2Fn, Sample3Fn, SampleTileable2Fn, SampleTileable3Fn, ShaderSpec } from './spec.js'

// The shared shader chunk libraries (already included in every spec's deps;
// exported for callers composing sources fully by hand).
export { COMMON_GLSL } from './noises/common.glsl.js'
export { COMMON_TSL } from './noises/common.tsl.js'
export { COMMON_WGSL } from './noises/common.wgsl.js'

// CPU primitives, for building noises of your own.
export { fade, gradDot2, gradDot3, hash2, hash3, hash4, hashU32, imod, lerp, to01 } from './noises/common.js'
export { clamp01 } from './noises/normalization.js'

// ---------------------------------------------------------------------------
// Per-variant exports. One line per module; each name is independently
// tree-shakeable because the build preserves the module graph.
export {
  crackle2dCanonicalGlsl,
  crackle3dCanonicalGlsl,
  foam2dCanonicalGlsl,
  foam3dCanonicalGlsl,
  mosaic2dCanonicalGlsl,
  mosaic3dCanonicalGlsl,
  stars2dCanonicalGlsl,
  stars3dCanonicalGlsl,
} from './noises/cellular.glsl.js'
export {
  crackle2dCanonical,
  crackle3dCanonical,
  foam2dCanonical,
  foam3dCanonical,
  mosaic2dCanonical,
  mosaic3dCanonical,
  stars2dCanonical,
  stars3dCanonical,
} from './noises/cellular.js'
export {
  crackle2dCanonicalTsl,
  crackle3dCanonicalTsl,
  foam2dCanonicalTsl,
  foam3dCanonicalTsl,
  mosaic2dCanonicalTsl,
  mosaic3dCanonicalTsl,
  stars2dCanonicalTsl,
  stars3dCanonicalTsl,
} from './noises/cellular.tsl.js'
export {
  crackle2dCanonicalWgsl,
  crackle3dCanonicalWgsl,
  foam2dCanonicalWgsl,
  foam3dCanonicalWgsl,
  mosaic2dCanonicalWgsl,
  mosaic3dCanonicalWgsl,
  stars2dCanonicalWgsl,
  stars3dCanonicalWgsl,
} from './noises/cellular.wgsl.js'
export { flow3dCanonicalGlsl } from './noises/flow.glsl.js'
export { flow3dCanonical } from './noises/flow.js'
export { flow3dCanonicalTsl } from './noises/flow.tsl.js'
export { flow3dCanonicalWgsl } from './noises/flow.wgsl.js'
export { gabor2dCanonicalGlsl, gabor3dCanonicalGlsl } from './noises/gabor.glsl.js'
export { gabor2dCanonical, gabor3dCanonical } from './noises/gabor.js'
export { gabor2dCanonicalTsl, gabor3dCanonicalTsl } from './noises/gabor.tsl.js'
export { gabor2dCanonicalWgsl, gabor3dCanonicalWgsl } from './noises/gabor.wgsl.js'
export {
  contour2dCanonicalGlsl,
  contour3dCanonicalGlsl,
  marble2dCanonicalGlsl,
  marble3dCanonicalGlsl,
} from './noises/perlin-derived.glsl.js'
export {
  contour2dCanonical,
  contour3dCanonical,
  marble2dCanonical,
  marble3dCanonical,
} from './noises/perlin-derived.js'
export {
  contour2dCanonicalTsl,
  contour3dCanonicalTsl,
  marble2dCanonicalTsl,
  marble3dCanonicalTsl,
} from './noises/perlin-derived.tsl.js'
export {
  contour2dCanonicalWgsl,
  contour3dCanonicalWgsl,
  marble2dCanonicalWgsl,
  marble3dCanonicalWgsl,
} from './noises/perlin-derived.wgsl.js'
export { perlin2dCanonicalGlsl, perlin3dCanonicalGlsl } from './noises/perlin.glsl.js'
export { perlin2dCanonical, perlin3dCanonical } from './noises/perlin.js'
export { perlin2dCanonicalTsl, perlin3dCanonicalTsl } from './noises/perlin.tsl.js'
export { perlin2dCanonicalWgsl, perlin3dCanonicalWgsl } from './noises/perlin.wgsl.js'
export { ripple2dCanonicalGlsl, ripple3dCanonicalGlsl } from './noises/ripple.glsl.js'
export { ripple2dCanonical, ripple3dCanonical } from './noises/ripple.js'
export { ripple2dCanonicalTsl, ripple3dCanonicalTsl } from './noises/ripple.tsl.js'
export { ripple2dCanonicalWgsl, ripple3dCanonicalWgsl } from './noises/ripple.wgsl.js'
export { simplexLoop3dCanonicalGlsl } from './noises/simplex-loop.glsl.js'
export { simplexLoop3dCanonical } from './noises/simplex-loop.js'
export { simplexLoop3dCanonicalTsl } from './noises/simplex-loop.tsl.js'
export { simplexLoop3dCanonicalWgsl } from './noises/simplex-loop.wgsl.js'
export { simplexValue2dCanonicalGlsl, simplexValue3dCanonicalGlsl } from './noises/simplex-value.glsl.js'
export { simplexValue2dCanonical, simplexValue3dCanonical } from './noises/simplex-value.js'
export { simplexValue2dCanonicalTsl, simplexValue3dCanonicalTsl } from './noises/simplex-value.tsl.js'
export { simplexValue2dCanonicalWgsl, simplexValue3dCanonicalWgsl } from './noises/simplex-value.wgsl.js'
export { simplex2dCanonicalGlsl, simplex3dCanonicalGlsl } from './noises/simplex.glsl.js'
export { simplex2dCanonical, simplex3dCanonical } from './noises/simplex.js'
export { simplex2dCanonicalTsl, simplex3dCanonicalTsl } from './noises/simplex.tsl.js'
export { simplex2dCanonicalWgsl, simplex3dCanonicalWgsl } from './noises/simplex.wgsl.js'
export { truchet2dCanonicalGlsl } from './noises/truchet.glsl.js'
export { truchet2dCanonical } from './noises/truchet.js'
export { truchet2dCanonicalTsl } from './noises/truchet.tsl.js'
export { truchet2dCanonicalWgsl } from './noises/truchet.wgsl.js'
export { value2dCanonicalGlsl, value3dCanonicalGlsl } from './noises/value.glsl.js'
export { value2dCanonical, value3dCanonical } from './noises/value.js'
export { value2dCanonicalTsl, value3dCanonicalTsl } from './noises/value.tsl.js'
export { value2dCanonicalWgsl, value3dCanonicalWgsl } from './noises/value.wgsl.js'
export { vortex2dCanonicalGlsl, vortex3dCanonicalGlsl } from './noises/vortex.glsl.js'
export { vortex2dCanonical, vortex3dCanonical } from './noises/vortex.js'
export { vortex2dCanonicalTsl, vortex3dCanonicalTsl } from './noises/vortex.tsl.js'
export { vortex2dCanonicalWgsl, vortex3dCanonicalWgsl } from './noises/vortex.wgsl.js'
export { wave2dCanonicalGlsl, wave3dCanonicalGlsl } from './noises/wave.glsl.js'
export { wave2dCanonical, wave3dCanonical } from './noises/wave.js'
export { wave2dCanonicalTsl, wave3dCanonicalTsl } from './noises/wave.tsl.js'
export { wave2dCanonicalWgsl, wave3dCanonicalWgsl } from './noises/wave.wgsl.js'
export { white2dCanonicalGlsl, white3dCanonicalGlsl } from './noises/white.glsl.js'
export { white2dCanonical, white3dCanonical } from './noises/white.js'
export { white2dCanonicalTsl, white3dCanonicalTsl } from './noises/white.tsl.js'
export { white2dCanonicalWgsl, white3dCanonicalWgsl } from './noises/white.wgsl.js'
export {
  worleyChebyshev2dCanonicalGlsl,
  worleyChebyshev3dCanonicalGlsl,
  worleyManhattan2dCanonicalGlsl,
  worleyManhattan3dCanonicalGlsl,
} from './noises/worley-metrics.glsl.js'
export {
  worleyChebyshev2dCanonical,
  worleyChebyshev3dCanonical,
  worleyManhattan2dCanonical,
  worleyManhattan3dCanonical,
} from './noises/worley-metrics.js'
export {
  worleyChebyshev2dCanonicalTsl,
  worleyChebyshev3dCanonicalTsl,
  worleyManhattan2dCanonicalTsl,
  worleyManhattan3dCanonicalTsl,
} from './noises/worley-metrics.tsl.js'
export {
  worleyChebyshev2dCanonicalWgsl,
  worleyChebyshev3dCanonicalWgsl,
  worleyManhattan2dCanonicalWgsl,
  worleyManhattan3dCanonicalWgsl,
} from './noises/worley-metrics.wgsl.js'
export { worley2dCanonicalGlsl, worley3dCanonicalGlsl } from './noises/worley.glsl.js'
export { worley2dCanonical, worley3dCanonical } from './noises/worley.js'
export { worley2dCanonicalTsl, worley3dCanonicalTsl } from './noises/worley.tsl.js'
export { worley2dCanonicalWgsl, worley3dCanonicalWgsl } from './noises/worley.wgsl.js'
export {
  crackle2dCanonicalTileableGlsl,
  crackle3dCanonicalTileableGlsl,
  foam2dCanonicalTileableGlsl,
  foam3dCanonicalTileableGlsl,
  mosaic2dCanonicalTileableGlsl,
  mosaic3dCanonicalTileableGlsl,
  stars2dCanonicalTileableGlsl,
  stars3dCanonicalTileableGlsl,
} from './noises/tileable/cellular-tileable.glsl.js'
export {
  crackle2dCanonicalTileable,
  crackle3dCanonicalTileable,
  foam2dCanonicalTileable,
  foam3dCanonicalTileable,
  mosaic2dCanonicalTileable,
  mosaic3dCanonicalTileable,
  stars2dCanonicalTileable,
  stars3dCanonicalTileable,
} from './noises/tileable/cellular-tileable.js'
export {
  crackle2dCanonicalTileableTsl,
  crackle3dCanonicalTileableTsl,
  foam2dCanonicalTileableTsl,
  foam3dCanonicalTileableTsl,
  mosaic2dCanonicalTileableTsl,
  mosaic3dCanonicalTileableTsl,
  stars2dCanonicalTileableTsl,
  stars3dCanonicalTileableTsl,
} from './noises/tileable/cellular-tileable.tsl.js'
export {
  crackle2dCanonicalTileableWgsl,
  crackle3dCanonicalTileableWgsl,
  foam2dCanonicalTileableWgsl,
  foam3dCanonicalTileableWgsl,
  mosaic2dCanonicalTileableWgsl,
  mosaic3dCanonicalTileableWgsl,
  stars2dCanonicalTileableWgsl,
  stars3dCanonicalTileableWgsl,
} from './noises/tileable/cellular-tileable.wgsl.js'
export { flow3dCanonicalTileableGlsl } from './noises/tileable/flow-tileable.glsl.js'
export { flow3dCanonicalTileable } from './noises/tileable/flow-tileable.js'
export { flow3dCanonicalTileableTsl } from './noises/tileable/flow-tileable.tsl.js'
export { flow3dCanonicalTileableWgsl } from './noises/tileable/flow-tileable.wgsl.js'
export { gabor2dCanonicalTileableGlsl, gabor3dCanonicalTileableGlsl } from './noises/tileable/gabor-tileable.glsl.js'
export { gabor2dCanonicalTileable, gabor3dCanonicalTileable } from './noises/tileable/gabor-tileable.js'
export { gabor2dCanonicalTileableTsl, gabor3dCanonicalTileableTsl } from './noises/tileable/gabor-tileable.tsl.js'
export { gabor2dCanonicalTileableWgsl, gabor3dCanonicalTileableWgsl } from './noises/tileable/gabor-tileable.wgsl.js'
export {
  contour2dCanonicalTileableGlsl,
  contour3dCanonicalTileableGlsl,
  marble2dCanonicalTileableGlsl,
  marble3dCanonicalTileableGlsl,
} from './noises/tileable/perlin-derived-tileable.glsl.js'
export {
  contour2dCanonicalTileable,
  contour3dCanonicalTileable,
  marble2dCanonicalTileable,
  marble3dCanonicalTileable,
} from './noises/tileable/perlin-derived-tileable.js'
export {
  contour2dCanonicalTileableTsl,
  contour3dCanonicalTileableTsl,
  marble2dCanonicalTileableTsl,
  marble3dCanonicalTileableTsl,
} from './noises/tileable/perlin-derived-tileable.tsl.js'
export {
  contour2dCanonicalTileableWgsl,
  contour3dCanonicalTileableWgsl,
  marble2dCanonicalTileableWgsl,
  marble3dCanonicalTileableWgsl,
} from './noises/tileable/perlin-derived-tileable.wgsl.js'
export { perlin2dCanonicalTileableGlsl, perlin3dCanonicalTileableGlsl } from './noises/tileable/perlin-tileable.glsl.js'
export { perlin2dCanonicalTileable, perlin3dCanonicalTileable } from './noises/tileable/perlin-tileable.js'
export { perlin2dCanonicalTileableTsl, perlin3dCanonicalTileableTsl } from './noises/tileable/perlin-tileable.tsl.js'
export { perlin2dCanonicalTileableWgsl, perlin3dCanonicalTileableWgsl } from './noises/tileable/perlin-tileable.wgsl.js'
export { ripple2dCanonicalTileableGlsl, ripple3dCanonicalTileableGlsl } from './noises/tileable/ripple-tileable.glsl.js'
export { ripple2dCanonicalTileable, ripple3dCanonicalTileable } from './noises/tileable/ripple-tileable.js'
export { ripple2dCanonicalTileableTsl, ripple3dCanonicalTileableTsl } from './noises/tileable/ripple-tileable.tsl.js'
export { ripple2dCanonicalTileableWgsl, ripple3dCanonicalTileableWgsl } from './noises/tileable/ripple-tileable.wgsl.js'
export { simplex2dCanonicalTileableGlsl } from './noises/tileable/simplex-tileable.glsl.js'
export { simplex2dCanonicalTileable } from './noises/tileable/simplex-tileable.js'
export { simplex2dCanonicalTileableTsl } from './noises/tileable/simplex-tileable.tsl.js'
export { simplex2dCanonicalTileableWgsl } from './noises/tileable/simplex-tileable.wgsl.js'
export { simplexValue2dCanonicalTileableGlsl } from './noises/tileable/simplex-value-tileable.glsl.js'
export { simplexValue2dCanonicalTileable } from './noises/tileable/simplex-value-tileable.js'
export { simplexValue2dCanonicalTileableTsl } from './noises/tileable/simplex-value-tileable.tsl.js'
export { simplexValue2dCanonicalTileableWgsl } from './noises/tileable/simplex-value-tileable.wgsl.js'
export { truchet2dCanonicalTileableGlsl } from './noises/tileable/truchet-tileable.glsl.js'
export { truchet2dCanonicalTileable } from './noises/tileable/truchet-tileable.js'
export { truchet2dCanonicalTileableTsl } from './noises/tileable/truchet-tileable.tsl.js'
export { truchet2dCanonicalTileableWgsl } from './noises/tileable/truchet-tileable.wgsl.js'
export { value2dCanonicalTileableGlsl, value3dCanonicalTileableGlsl } from './noises/tileable/value-tileable.glsl.js'
export { value2dCanonicalTileable, value3dCanonicalTileable } from './noises/tileable/value-tileable.js'
export { value2dCanonicalTileableTsl, value3dCanonicalTileableTsl } from './noises/tileable/value-tileable.tsl.js'
export { value2dCanonicalTileableWgsl, value3dCanonicalTileableWgsl } from './noises/tileable/value-tileable.wgsl.js'
export { vortex2dCanonicalTileableGlsl, vortex3dCanonicalTileableGlsl } from './noises/tileable/vortex-tileable.glsl.js'
export { vortex2dCanonicalTileable, vortex3dCanonicalTileable } from './noises/tileable/vortex-tileable.js'
export { vortex2dCanonicalTileableTsl, vortex3dCanonicalTileableTsl } from './noises/tileable/vortex-tileable.tsl.js'
export { vortex2dCanonicalTileableWgsl, vortex3dCanonicalTileableWgsl } from './noises/tileable/vortex-tileable.wgsl.js'
export { wave2dCanonicalTileableGlsl, wave3dCanonicalTileableGlsl } from './noises/tileable/wave-tileable.glsl.js'
export { wave2dCanonicalTileable, wave3dCanonicalTileable } from './noises/tileable/wave-tileable.js'
export { wave2dCanonicalTileableTsl, wave3dCanonicalTileableTsl } from './noises/tileable/wave-tileable.tsl.js'
export { wave2dCanonicalTileableWgsl, wave3dCanonicalTileableWgsl } from './noises/tileable/wave-tileable.wgsl.js'
export { white2dCanonicalTileableGlsl, white3dCanonicalTileableGlsl } from './noises/tileable/white-tileable.glsl.js'
export { white2dCanonicalTileable, white3dCanonicalTileable } from './noises/tileable/white-tileable.js'
export { white2dCanonicalTileableTsl, white3dCanonicalTileableTsl } from './noises/tileable/white-tileable.tsl.js'
export { white2dCanonicalTileableWgsl, white3dCanonicalTileableWgsl } from './noises/tileable/white-tileable.wgsl.js'
export {
  worleyChebyshev2dCanonicalTileableGlsl,
  worleyChebyshev3dCanonicalTileableGlsl,
  worleyManhattan2dCanonicalTileableGlsl,
  worleyManhattan3dCanonicalTileableGlsl,
} from './noises/tileable/worley-metrics-tileable.glsl.js'
export {
  worleyChebyshev2dCanonicalTileable,
  worleyChebyshev3dCanonicalTileable,
  worleyManhattan2dCanonicalTileable,
  worleyManhattan3dCanonicalTileable,
} from './noises/tileable/worley-metrics-tileable.js'
export {
  worleyChebyshev2dCanonicalTileableTsl,
  worleyChebyshev3dCanonicalTileableTsl,
  worleyManhattan2dCanonicalTileableTsl,
  worleyManhattan3dCanonicalTileableTsl,
} from './noises/tileable/worley-metrics-tileable.tsl.js'
export {
  worleyChebyshev2dCanonicalTileableWgsl,
  worleyChebyshev3dCanonicalTileableWgsl,
  worleyManhattan2dCanonicalTileableWgsl,
  worleyManhattan3dCanonicalTileableWgsl,
} from './noises/tileable/worley-metrics-tileable.wgsl.js'
export { worley2dCanonicalTileableGlsl, worley3dCanonicalTileableGlsl } from './noises/tileable/worley-tileable.glsl.js'
export { worley2dCanonicalTileable, worley3dCanonicalTileable } from './noises/tileable/worley-tileable.js'
export { worley2dCanonicalTileableTsl, worley3dCanonicalTileableTsl } from './noises/tileable/worley-tileable.tsl.js'
export { worley2dCanonicalTileableWgsl, worley3dCanonicalTileableWgsl } from './noises/tileable/worley-tileable.wgsl.js'
export {
  crackle2dFastGlsl,
  crackle3dFastGlsl,
  foam2dFastGlsl,
  foam3dFastGlsl,
  mosaic2dFastGlsl,
  mosaic3dFastGlsl,
  ripple2dFastGlsl,
  ripple3dFastGlsl,
  stars2dFastGlsl,
  stars3dFastGlsl,
} from './alt/cellular-fast.glsl.js'
export {
  crackle2dFast,
  crackle3dFast,
  foam2dFast,
  foam3dFast,
  mosaic2dFast,
  mosaic3dFast,
  ripple2dFast,
  ripple3dFast,
  stars2dFast,
  stars3dFast,
} from './alt/cellular-fast.js'
export {
  crackle2dFastTsl,
  crackle3dFastTsl,
  foam2dFastTsl,
  foam3dFastTsl,
  mosaic2dFastTsl,
  mosaic3dFastTsl,
  ripple2dFastTsl,
  ripple3dFastTsl,
  stars2dFastTsl,
  stars3dFastTsl,
} from './alt/cellular-fast.tsl.js'
export {
  crackle2dFastWgsl,
  crackle3dFastWgsl,
  foam2dFastWgsl,
  foam3dFastWgsl,
  mosaic2dFastWgsl,
  mosaic3dFastWgsl,
  ripple2dFastWgsl,
  ripple3dFastWgsl,
  stars2dFastWgsl,
  stars3dFastWgsl,
} from './alt/cellular-fast.wgsl.js'
export { flow3dFastGlsl } from './alt/flow-fast.glsl.js'
export { flow3dFast } from './alt/flow-fast.js'
export { flow3dFastTsl } from './alt/flow-fast.tsl.js'
export { flow3dFastWgsl } from './alt/flow-fast.wgsl.js'
export { gabor2dFastGlsl, gabor3dFastGlsl } from './alt/gabor-fast.glsl.js'
export { gabor2dFast, gabor3dFast } from './alt/gabor-fast.js'
export { gabor2dFastTsl, gabor3dFastTsl } from './alt/gabor-fast.tsl.js'
export { gabor2dFastWgsl, gabor3dFastWgsl } from './alt/gabor-fast.wgsl.js'
export { perlin2dFastTileableGlsl, perlin3dFastTileableGlsl } from './alt/perlin-fast-tileable.glsl.js'
export { perlin2dFastTileable, perlin3dFastTileable } from './alt/perlin-fast-tileable.js'
export { perlin2dFastTileableTsl, perlin3dFastTileableTsl } from './alt/perlin-fast-tileable.tsl.js'
export { perlin2dFastTileableWgsl, perlin3dFastTileableWgsl } from './alt/perlin-fast-tileable.wgsl.js'
export { perlin2dFastGlsl, perlin3dFastGlsl } from './alt/perlin-fast.glsl.js'
export { perlin2dFast, perlin3dFast } from './alt/perlin-fast.js'
export { perlin2dFastTsl, perlin3dFastTsl } from './alt/perlin-fast.tsl.js'
export { perlin2dFastWgsl, perlin3dFastWgsl } from './alt/perlin-fast.wgsl.js'
export { simplex2dFastGlsl, simplex3dFastGlsl } from './alt/simplex-fast.glsl.js'
export { simplex2dFast, simplex3dFast } from './alt/simplex-fast.js'
export { simplex2dFastTsl, simplex3dFastTsl } from './alt/simplex-fast.tsl.js'
export { simplex2dFastWgsl, simplex3dFastWgsl } from './alt/simplex-fast.wgsl.js'
export { value2dFastGlsl, value3dFastGlsl } from './alt/value-fast.glsl.js'
export { value2dFast, value3dFast } from './alt/value-fast.js'
export { value2dFastTsl, value3dFastTsl } from './alt/value-fast.tsl.js'
export { value2dFastWgsl, value3dFastWgsl } from './alt/value-fast.wgsl.js'
export { vortex2dFastGlsl, vortex3dFastGlsl } from './alt/vortex-fast.glsl.js'
export { vortex2dFast, vortex3dFast } from './alt/vortex-fast.js'
export { vortex2dFastTsl, vortex3dFastTsl } from './alt/vortex-fast.tsl.js'
export { vortex2dFastWgsl, vortex3dFastWgsl } from './alt/vortex-fast.wgsl.js'
export { wave2dFastGlsl, wave3dFastGlsl } from './alt/wave-fast.glsl.js'
export { wave2dFast, wave3dFast } from './alt/wave-fast.js'
export { wave2dFastTsl, wave3dFastTsl } from './alt/wave-fast.tsl.js'
export { wave2dFastWgsl, wave3dFastWgsl } from './alt/wave-fast.wgsl.js'
export { worley2dFastGlsl, worley3dFastGlsl } from './alt/worley-fast.glsl.js'
export { worley2dFast, worley3dFast } from './alt/worley-fast.js'
export { worley2dFastTsl, worley3dFastTsl } from './alt/worley-fast.tsl.js'
export { worley2dFastWgsl, worley3dFastWgsl } from './alt/worley-fast.wgsl.js'
export {
  worleyChebyshev2dFastGlsl,
  worleyChebyshev3dFastGlsl,
  worleyManhattan2dFastGlsl,
  worleyManhattan3dFastGlsl,
} from './alt/worley-metrics-fast.glsl.js'
export {
  worleyChebyshev2dFast,
  worleyChebyshev3dFast,
  worleyManhattan2dFast,
  worleyManhattan3dFast,
} from './alt/worley-metrics-fast.js'
export {
  worleyChebyshev2dFastTsl,
  worleyChebyshev3dFastTsl,
  worleyManhattan2dFastTsl,
  worleyManhattan3dFastTsl,
} from './alt/worley-metrics-fast.tsl.js'
export {
  worleyChebyshev2dFastWgsl,
  worleyChebyshev3dFastWgsl,
  worleyManhattan2dFastWgsl,
  worleyManhattan3dFastWgsl,
} from './alt/worley-metrics-fast.wgsl.js'
