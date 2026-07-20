// Central registry of all noises. For each noise variant it exposes:
// - `sample` / `sampleTileable`: TS display functions returning [0, 1]
// - `glsl` / `glslTileable`: self-contained GLSL sources defining
//   `float noiseMain(vecN p)` / `float noiseMainT(vecN p, vec2 per)`
// - `wgsl` / `wgslTileable`: WGSL sources defining
//   `fn noiseMain(p: vecNf) -> f32` / `fn noiseMainT(p: vecNf, per: vec2f) -> f32`
//
// The display mapping (normalization + clamp to [0, 1]) lives here, not in the
// algorithm files, so the core implementations keep their natural ranges.

import { crackle2, crackle3, foam2, foam3, mosaic2, mosaic3, stars2, stars3 } from './noises/cellular'
import { CELLULAR_GLSL } from './noises/cellular.glsl'
import { CELLULAR_WGSL } from './noises/cellular.wgsl'
import { flow3 } from './noises/flow'
import { FLOW_GLSL } from './noises/flow.glsl'
import { FLOW_WGSL } from './noises/flow.wgsl'
import { gabor2, gabor3 } from './noises/gabor'
import { GABOR_GLSL } from './noises/gabor.glsl'
import { GABOR_WGSL } from './noises/gabor.wgsl'
import {
  CHEBYSHEV2_NORM,
  CHEBYSHEV3_NORM,
  clamp01,
  CRACKLE_NORM,
  fmt,
  GABOR2_NORM,
  GABOR3_NORM,
  MANHATTAN2_NORM,
  MANHATTAN3_NORM,
  PERLIN2_NORM,
  PERLIN3_NORM,
  RIPPLE_NORM,
  SIMPLEX_VALUE_NORM,
  SIMPLEX_VALUE4_NORM,
  SIMPLEX2_NORM,
  SIMPLEX3_NORM,
  SIMPLEX4_NORM,
  STARS_NORM,
} from './noises/normalization'
import { perlin2, perlin3 } from './noises/perlin'
import { contour2, contour3, marble2, marble3 } from './noises/perlin-derived'
import { PERLIN_DERIVED_GLSL } from './noises/perlin-derived.glsl'
import { PERLIN_DERIVED_WGSL } from './noises/perlin-derived.wgsl'
import { PERLIN_GLSL } from './noises/perlin.glsl'
import { PERLIN_WGSL } from './noises/perlin.wgsl'
import { ripple2, ripple3 } from './noises/ripple'
import { RIPPLE_GLSL } from './noises/ripple.glsl'
import { RIPPLE_WGSL } from './noises/ripple.wgsl'
import { simplex2, simplex3 } from './noises/simplex'
import { simplexLoop3 } from './noises/simplex-loop'
import { SIMPLEX_LOOP_GLSL } from './noises/simplex-loop.glsl'
import { SIMPLEX_LOOP_WGSL } from './noises/simplex-loop.wgsl'
import { simplexValue2, simplexValue3 } from './noises/simplex-value'
import { SIMPLEX_VALUE_GLSL } from './noises/simplex-value.glsl'
import { SIMPLEX_VALUE_WGSL } from './noises/simplex-value.wgsl'
import { SIMPLEX_GLSL } from './noises/simplex.glsl'
import { SIMPLEX_WGSL } from './noises/simplex.wgsl'
import { SIMPLEX4_GLSL } from './noises/simplex4.glsl'
import { SIMPLEX4_WGSL } from './noises/simplex4.wgsl'
import {
  crackle2Tileable,
  crackle3Tileable,
  foam2Tileable,
  foam3Tileable,
  mosaic2Tileable,
  mosaic3Tileable,
  stars2Tileable,
  stars3Tileable,
} from './noises/tileable/cellular-tileable'
import { CELLULAR_TILEABLE_GLSL } from './noises/tileable/cellular-tileable.glsl'
import { CELLULAR_TILEABLE_WGSL } from './noises/tileable/cellular-tileable.wgsl'
import { flow3Tileable } from './noises/tileable/flow-tileable'
import { FLOW_TILEABLE_GLSL } from './noises/tileable/flow-tileable.glsl'
import { FLOW_TILEABLE_WGSL } from './noises/tileable/flow-tileable.wgsl'
import { gabor2Tileable, gabor3Tileable } from './noises/tileable/gabor-tileable'
import { GABOR_TILEABLE_GLSL } from './noises/tileable/gabor-tileable.glsl'
import { GABOR_TILEABLE_WGSL } from './noises/tileable/gabor-tileable.wgsl'
import {
  contour2Tileable,
  contour3Tileable,
  marble2Tileable,
  marble3Tileable,
} from './noises/tileable/perlin-derived-tileable'
import { PERLIN_DERIVED_TILEABLE_GLSL } from './noises/tileable/perlin-derived-tileable.glsl'
import { PERLIN_DERIVED_TILEABLE_WGSL } from './noises/tileable/perlin-derived-tileable.wgsl'
import { perlin2Tileable, perlin3Tileable } from './noises/tileable/perlin-tileable'
import { PERLIN_TILEABLE_GLSL } from './noises/tileable/perlin-tileable.glsl'
import { PERLIN_TILEABLE_WGSL } from './noises/tileable/perlin-tileable.wgsl'
import { ripple2Tileable, ripple3Tileable } from './noises/tileable/ripple-tileable'
import { RIPPLE_TILEABLE_GLSL } from './noises/tileable/ripple-tileable.glsl'
import { RIPPLE_TILEABLE_WGSL } from './noises/tileable/ripple-tileable.wgsl'
import { simplex2TileableTorus } from './noises/tileable/simplex-tileable'
import { SIMPLEX_TILEABLE_GLSL } from './noises/tileable/simplex-tileable.glsl'
import { SIMPLEX_TILEABLE_WGSL } from './noises/tileable/simplex-tileable.wgsl'
import { simplexValue2TileableTorus } from './noises/tileable/simplex-value-tileable'
import { SIMPLEX_VALUE_TILEABLE_GLSL } from './noises/tileable/simplex-value-tileable.glsl'
import { SIMPLEX_VALUE_TILEABLE_WGSL } from './noises/tileable/simplex-value-tileable.wgsl'
import { truchet2Tileable } from './noises/tileable/truchet-tileable'
import { TRUCHET_TILEABLE_GLSL } from './noises/tileable/truchet-tileable.glsl'
import { TRUCHET_TILEABLE_WGSL } from './noises/tileable/truchet-tileable.wgsl'
import { value2Tileable, value3Tileable } from './noises/tileable/value-tileable'
import { VALUE_TILEABLE_GLSL } from './noises/tileable/value-tileable.glsl'
import { VALUE_TILEABLE_WGSL } from './noises/tileable/value-tileable.wgsl'
import { vortex2Tileable, vortex3Tileable } from './noises/tileable/vortex-tileable'
import { VORTEX_TILEABLE_GLSL } from './noises/tileable/vortex-tileable.glsl'
import { VORTEX_TILEABLE_WGSL } from './noises/tileable/vortex-tileable.wgsl'
import { wave2Tileable, wave3Tileable } from './noises/tileable/wave-tileable'
import { WAVE_TILEABLE_GLSL } from './noises/tileable/wave-tileable.glsl'
import { WAVE_TILEABLE_WGSL } from './noises/tileable/wave-tileable.wgsl'
import { white2Tileable, white3Tileable } from './noises/tileable/white-tileable'
import { WHITE_TILEABLE_GLSL } from './noises/tileable/white-tileable.glsl'
import { WHITE_TILEABLE_WGSL } from './noises/tileable/white-tileable.wgsl'
import {
  chebyshev2Tileable,
  chebyshev3Tileable,
  manhattan2Tileable,
  manhattan3Tileable,
} from './noises/tileable/worley-metrics-tileable'
import { WORLEY_METRICS_TILEABLE_GLSL } from './noises/tileable/worley-metrics-tileable.glsl'
import { WORLEY_METRICS_TILEABLE_WGSL } from './noises/tileable/worley-metrics-tileable.wgsl'
import { worley2Tileable, worley3Tileable } from './noises/tileable/worley-tileable'
import { WORLEY_TILEABLE_GLSL } from './noises/tileable/worley-tileable.glsl'
import { WORLEY_TILEABLE_WGSL } from './noises/tileable/worley-tileable.wgsl'
import { truchet2 } from './noises/truchet'
import { TRUCHET_GLSL } from './noises/truchet.glsl'
import { TRUCHET_WGSL } from './noises/truchet.wgsl'
import { getTslSpec } from './noises/tsl-specs'
import { value2, value3 } from './noises/value'
import { VALUE_GLSL } from './noises/value.glsl'
import { VALUE_WGSL } from './noises/value.wgsl'
import { vortex2, vortex3 } from './noises/vortex'
import { VORTEX_GLSL } from './noises/vortex.glsl'
import { VORTEX_WGSL } from './noises/vortex.wgsl'
import { wave2, wave3 } from './noises/wave'
import { WAVE_GLSL } from './noises/wave.glsl'
import { WAVE_WGSL } from './noises/wave.wgsl'
import { white2, white3 } from './noises/white'
import { WHITE_GLSL } from './noises/white.glsl'
import { WHITE_WGSL } from './noises/white.wgsl'
import { worley2, worley3 } from './noises/worley'
import { chebyshev2, chebyshev3, manhattan2, manhattan3 } from './noises/worley-metrics'
import { WORLEY_METRICS_GLSL } from './noises/worley-metrics.glsl'
import { WORLEY_METRICS_WGSL } from './noises/worley-metrics.wgsl'
import { WORLEY_GLSL } from './noises/worley.glsl'
import { WORLEY_WGSL } from './noises/worley.wgsl'

export type Backend = 'js' | 'webgl' | 'webgpu' | 'three'

export type SampleFn = (x: number, y: number, z: number) => number
export type SampleTileableFn = (x: number, y: number, z: number, px: number, py: number) => number

/**
 * Composable shader source: dependency chunks (excluding the common hash
 * library, which renderers prepend once) plus a display expression in [0, 1]
 * over `p` (and `per` for tileable specs). Kept as pieces rather than a
 * composed program so multi-layer renders can deduplicate shared chunks.
 */
export type ShaderSpec = { dim: 2 | 3; deps: string[]; expr: string }

export type NoiseVariant = {
  id: string
  label: string
  dim: 2 | 3
  sample: SampleFn
  sampleTileable: SampleTileableFn | null
  glsl: ShaderSpec
  glslTileable: ShaderSpec | null
  wgsl: ShaderSpec
  wgslTileable: ShaderSpec | null
  /** Three.js TSL (source strings evaluated against the three/tsl namespace). */
  tsl: ShaderSpec
  tslTileable: ShaderSpec | null
}

/** Registry entries are defined without TSL specs; they are merged in below from tsl-specs.ts. */
type NoiseVariantBase = Omit<NoiseVariant, 'tsl' | 'tslTileable'>
type NoiseDefBase = Omit<NoiseDef, 'variants'> & { variants: NoiseVariantBase[] }

export type NoiseDef = {
  id: string
  name: string
  description: string
  license: string
  /**
   * True for noises invented in this repo rather than implementations of
   * published algorithms. Their descriptions disclose any prior art they build
   * on (lattice skew, cellular bases, and so on).
   */
  original?: boolean
  /** True when at least one variant has a tileable code path. */
  tileable: boolean
  /**
   * How the tileable path works: 'lattice-wrap' wraps lattice coordinates
   * (identical to the core away from the seam), 'torus' samples a
   * higher-dimensional noise on a torus (a different pattern than the core),
   * 'lattice-wrap-derived' composes wrapped fields whose internal coordinates
   * exceed the period (tiles exactly, but the pattern differs from the core —
   * e.g. Marble, whose turbulence octaves wrap at their own periods).
   */
  tileableStrategy?: 'lattice-wrap' | 'torus' | 'lattice-wrap-derived'
  /** Lattice cells across one tile; also the tiling period. */
  scale: number
  /**
   * The variants a caller gets by default — always the current fastest
   * implementation of this noise. Alternative implementations are deliberately
   * NOT reachable from here: they live behind `noisetoy/implementations` so
   * that importing a noise never drags in the implementations it beat. See
   * implementations.ts.
   */
  variants: NoiseVariant[]
}

const spec = (dim: 2 | 3, deps: string[], expr: string): ShaderSpec => ({ dim, deps, expr })

const glslMain = spec
const glslMainT = spec
const wgslMain = spec
const wgslMainT = spec

const signedExpr = (norm: number, call: string): string => `clamp(0.5 + 0.5 * ${fmt(norm)} * ${call}, 0.0, 1.0)`

const signedTs =
  (norm: number, fn: (...args: number[]) => number) =>
  (...args: number[]): number =>
    clamp01(0.5 + 0.5 * norm * fn(...args))

const RAW_NOISES: NoiseDefBase[] = [
  {
    id: 'value',
    name: 'Value',
    description: 'Random values on an integer lattice, quintic-smoothed interpolation.',
    license: 'MIT (original implementation)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'value-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => value2(x, y),
        sampleTileable: (x, y, _z, px, py) => value2Tileable(x, y, px, py),
        glsl: glslMain(2, [VALUE_GLSL], 'value2(p)'),
        glslTileable: glslMainT(2, [VALUE_TILEABLE_GLSL], 'value2T(p, per)'),
        wgsl: wgslMain(2, [VALUE_WGSL], 'value2(p)'),
        wgslTileable: wgslMainT(2, [VALUE_TILEABLE_WGSL], 'value2T(p, per)'),
      },
      {
        id: 'value-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => value3(x, y, z),
        sampleTileable: (x, y, z, px, py) => value3Tileable(x, y, z, px, py),
        glsl: glslMain(3, [VALUE_GLSL], 'value3(p)'),
        glslTileable: glslMainT(3, [VALUE_TILEABLE_GLSL], 'value3T(p, per)'),
        wgsl: wgslMain(3, [VALUE_WGSL], 'value3(p)'),
        wgslTileable: wgslMainT(3, [VALUE_TILEABLE_WGSL], 'value3T(p, per)'),
      },
    ],
  },
  {
    id: 'white',
    name: 'White',
    description:
      'One independent hashed value per lattice cell, uninterpolated — a flat power spectrum. The default scale is one cell per pixel at 256px, which reads as film grain; lower it for blocks. Being unfiltered, it aliases under minification by definition.',
    license: 'MIT (original implementation, folklore technique)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 256,
    variants: [
      {
        id: 'white-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => white2(x, y),
        sampleTileable: (x, y, _z, px, py) => white2Tileable(x, y, px, py),
        glsl: glslMain(2, [WHITE_GLSL], 'white2(p)'),
        glslTileable: glslMainT(2, [WHITE_TILEABLE_GLSL], 'white2T(p, per)'),
        wgsl: wgslMain(2, [WHITE_WGSL], 'white2(p)'),
        wgslTileable: wgslMainT(2, [WHITE_TILEABLE_WGSL], 'white2T(p, per)'),
      },
      {
        id: 'white-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => white3(x, y, z),
        sampleTileable: (x, y, z, px, py) => white3Tileable(x, y, z, px, py),
        glsl: glslMain(3, [WHITE_GLSL], 'white3(p)'),
        glslTileable: glslMainT(3, [WHITE_TILEABLE_GLSL], 'white3T(p, per)'),
        wgsl: wgslMain(3, [WHITE_WGSL], 'white3(p)'),
        wgslTileable: wgslMainT(3, [WHITE_TILEABLE_WGSL], 'white3T(p, per)'),
      },
    ],
  },
  {
    id: 'perlin',
    name: 'Perlin',
    description: 'Gradient noise with quintic fade, after Ken Perlin (2002). Hash-derived unit gradients.',
    license: 'MIT (original implementation, algorithm by Ken Perlin)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'perlin-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * PERLIN2_NORM * perlin2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * PERLIN2_NORM * perlin2Tileable(x, y, px, py)),
        glsl: glslMain(2, [PERLIN_GLSL], signedExpr(PERLIN2_NORM, 'perlin2(p)')),
        glslTileable: glslMainT(2, [PERLIN_GLSL, PERLIN_TILEABLE_GLSL], signedExpr(PERLIN2_NORM, 'perlin2T(p, per)')),
        wgsl: wgslMain(2, [PERLIN_WGSL], signedExpr(PERLIN2_NORM, 'perlin2(p)')),
        wgslTileable: wgslMainT(2, [PERLIN_WGSL, PERLIN_TILEABLE_WGSL], signedExpr(PERLIN2_NORM, 'perlin2T(p, per)')),
      },
      {
        id: 'perlin-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(0.5 + 0.5 * PERLIN3_NORM * perlin3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * PERLIN3_NORM * perlin3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [PERLIN_GLSL], signedExpr(PERLIN3_NORM, 'perlin3(p)')),
        glslTileable: glslMainT(3, [PERLIN_GLSL, PERLIN_TILEABLE_GLSL], signedExpr(PERLIN3_NORM, 'perlin3T(p, per)')),
        wgsl: wgslMain(3, [PERLIN_WGSL], signedExpr(PERLIN3_NORM, 'perlin3(p)')),
        wgslTileable: wgslMainT(3, [PERLIN_WGSL, PERLIN_TILEABLE_WGSL], signedExpr(PERLIN3_NORM, 'perlin3T(p, per)')),
      },
    ],
  },
  {
    id: 'flow',
    name: 'Flow',
    description:
      'Gradient noise whose lattice gradients rotate as the third input advances, after Perlin & Neyret (2001) — the field churns in place instead of sliding through a volume. The third input is a rotation phase, not a depth. Each corner turns at its own integer rate, which departs from the paper (it rotates every gradient by one shared angle) but keeps the animation looping exactly every 1 unit: four seconds at the default z speed.',
    license: 'MIT (original implementation, technique after Ken Perlin & Fabrice Neyret)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'flow-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(PERLIN2_NORM, flow3),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * PERLIN2_NORM * flow3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [FLOW_GLSL], signedExpr(PERLIN2_NORM, 'flow3(p)')),
        glslTileable: glslMainT(3, [FLOW_GLSL, FLOW_TILEABLE_GLSL], signedExpr(PERLIN2_NORM, 'flow3T(p, per)')),
        wgsl: wgslMain(3, [FLOW_WGSL], signedExpr(PERLIN2_NORM, 'flow3(p)')),
        wgslTileable: wgslMainT(3, [FLOW_WGSL, FLOW_TILEABLE_WGSL], signedExpr(PERLIN2_NORM, 'flow3T(p, per)')),
      },
    ],
  },
  {
    id: 'simplex',
    name: 'Simplex',
    description: 'Simplex-grid gradient noise, after Ken Perlin (2001; patent expired 2022).',
    license: 'MIT (original implementation, algorithm by Ken Perlin)',
    tileable: true,
    tileableStrategy: 'torus',
    scale: 8,
    variants: [
      {
        id: 'simplex-2d',
        label: '2D',
        dim: 2,
        sample: signedTs(SIMPLEX2_NORM, simplex2),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * SIMPLEX4_NORM * simplex2TileableTorus(x, y, px, py)),
        glsl: glslMain(2, [SIMPLEX_GLSL], signedExpr(SIMPLEX2_NORM, 'simplex2(p)')),
        glslTileable: glslMainT(
          2,
          [SIMPLEX4_GLSL, SIMPLEX_TILEABLE_GLSL],
          signedExpr(SIMPLEX4_NORM, 'simplex2T(p, per)'),
        ),
        wgsl: wgslMain(2, [SIMPLEX_WGSL], signedExpr(SIMPLEX2_NORM, 'simplex2(p)')),
        wgslTileable: wgslMainT(
          2,
          [SIMPLEX4_WGSL, SIMPLEX_TILEABLE_WGSL],
          signedExpr(SIMPLEX4_NORM, 'simplex2T(p, per)'),
        ),
      },
      {
        id: 'simplex-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(SIMPLEX3_NORM, simplex3),
        sampleTileable: null,
        glsl: glslMain(3, [SIMPLEX_GLSL], signedExpr(SIMPLEX3_NORM, 'simplex3(p)')),
        glslTileable: null,
        wgsl: wgslMain(3, [SIMPLEX_WGSL], signedExpr(SIMPLEX3_NORM, 'simplex3(p)')),
        wgslTileable: null,
      },
    ],
  },
  {
    id: 'simplex-loop',
    name: 'Simplex Loop',
    description:
      'Simplex noise that returns exactly to itself every 1 unit of the third input: the x/y plane is embedded in 4D and the third input drives a circle in the remaining two dimensions. The only noise here whose animation loops seamlessly (four seconds at the default z speed). Not tileable — both spare dimensions are spent on the time circle.',
    license: 'MIT (original implementation, 4D simplex by Ken Perlin; patent expired 2022)',
    tileable: false,
    scale: 8,
    variants: [
      {
        id: 'simplex-loop-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(SIMPLEX4_NORM, simplexLoop3),
        sampleTileable: null,
        glsl: glslMain(3, [SIMPLEX4_GLSL, SIMPLEX_LOOP_GLSL], signedExpr(SIMPLEX4_NORM, 'simplexLoop3(p)')),
        glslTileable: null,
        wgsl: wgslMain(3, [SIMPLEX4_WGSL, SIMPLEX_LOOP_WGSL], signedExpr(SIMPLEX4_NORM, 'simplexLoop3(p)')),
        wgslTileable: null,
      },
    ],
  },
  {
    id: 'worley',
    name: 'Worley',
    description: 'Cellular noise (F1 distance to nearest feature point), after Steven Worley (1996).',
    license: 'MIT (original implementation, algorithm by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'worley-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(worley2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(worley2Tileable(x, y, px, py)),
        glsl: glslMain(2, [WORLEY_GLSL], 'clamp(worley2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(2, [WORLEY_TILEABLE_GLSL], 'clamp(worley2T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(2, [WORLEY_WGSL], 'clamp(worley2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(2, [WORLEY_TILEABLE_WGSL], 'clamp(worley2T(p, per), 0.0, 1.0)'),
      },
      {
        id: 'worley-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(worley3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(worley3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [WORLEY_GLSL], 'clamp(worley3(p), 0.0, 1.0)'),
        glslTileable: glslMainT(3, [WORLEY_TILEABLE_GLSL], 'clamp(worley3T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(3, [WORLEY_WGSL], 'clamp(worley3(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(3, [WORLEY_TILEABLE_WGSL], 'clamp(worley3T(p, per), 0.0, 1.0)'),
      },
    ],
  },
  {
    id: 'worley-manhattan',
    name: 'Worley (Manhattan)',
    description:
      'Cellular noise under the L1 metric |dx| + |dy|: same feature points as Worley, but the distance contours around each are diamonds rather than circles. Worley (1996) discusses this metric by name, noting it forms rigidly rectangular regions.',
    license: 'MIT (original implementation, algorithm by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'worley-manhattan-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(MANHATTAN2_NORM * manhattan2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(MANHATTAN2_NORM * manhattan2Tileable(x, y, px, py)),
        glsl: glslMain(2, [WORLEY_METRICS_GLSL], `clamp(${fmt(MANHATTAN2_NORM)} * manhattan2(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          2,
          [WORLEY_METRICS_TILEABLE_GLSL],
          `clamp(${fmt(MANHATTAN2_NORM)} * manhattan2T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(2, [WORLEY_METRICS_WGSL], `clamp(${fmt(MANHATTAN2_NORM)} * manhattan2(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          2,
          [WORLEY_METRICS_TILEABLE_WGSL],
          `clamp(${fmt(MANHATTAN2_NORM)} * manhattan2T(p, per), 0.0, 1.0)`,
        ),
      },
      {
        id: 'worley-manhattan-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(MANHATTAN3_NORM * manhattan3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(MANHATTAN3_NORM * manhattan3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [WORLEY_METRICS_GLSL], `clamp(${fmt(MANHATTAN3_NORM)} * manhattan3(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          3,
          [WORLEY_METRICS_TILEABLE_GLSL],
          `clamp(${fmt(MANHATTAN3_NORM)} * manhattan3T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(3, [WORLEY_METRICS_WGSL], `clamp(${fmt(MANHATTAN3_NORM)} * manhattan3(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          3,
          [WORLEY_METRICS_TILEABLE_WGSL],
          `clamp(${fmt(MANHATTAN3_NORM)} * manhattan3T(p, per), 0.0, 1.0)`,
        ),
      },
    ],
  },
  {
    id: 'worley-chebyshev',
    name: 'Worley (Chebyshev)',
    description:
      'Cellular noise under the Linf metric max(|dx|, |dy|): same feature points as Worley, but the distance contours around each are axis-aligned squares. The Linf ball is the L1 ball rotated 45 degrees, so this is Manhattan turned on its corner rather than an unrelated look. Unlike Manhattan, this metric is not in Worley’s paper — substituting it is later shader folklore.',
    license: 'MIT (original implementation, algorithm by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'worley-chebyshev-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(CHEBYSHEV2_NORM * chebyshev2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(CHEBYSHEV2_NORM * chebyshev2Tileable(x, y, px, py)),
        glsl: glslMain(2, [WORLEY_METRICS_GLSL], `clamp(${fmt(CHEBYSHEV2_NORM)} * chebyshev2(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          2,
          [WORLEY_METRICS_TILEABLE_GLSL],
          `clamp(${fmt(CHEBYSHEV2_NORM)} * chebyshev2T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(2, [WORLEY_METRICS_WGSL], `clamp(${fmt(CHEBYSHEV2_NORM)} * chebyshev2(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          2,
          [WORLEY_METRICS_TILEABLE_WGSL],
          `clamp(${fmt(CHEBYSHEV2_NORM)} * chebyshev2T(p, per), 0.0, 1.0)`,
        ),
      },
      {
        id: 'worley-chebyshev-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(CHEBYSHEV3_NORM * chebyshev3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(CHEBYSHEV3_NORM * chebyshev3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [WORLEY_METRICS_GLSL], `clamp(${fmt(CHEBYSHEV3_NORM)} * chebyshev3(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          3,
          [WORLEY_METRICS_TILEABLE_GLSL],
          `clamp(${fmt(CHEBYSHEV3_NORM)} * chebyshev3T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(3, [WORLEY_METRICS_WGSL], `clamp(${fmt(CHEBYSHEV3_NORM)} * chebyshev3(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          3,
          [WORLEY_METRICS_TILEABLE_WGSL],
          `clamp(${fmt(CHEBYSHEV3_NORM)} * chebyshev3T(p, per), 0.0, 1.0)`,
        ),
      },
    ],
  },
  {
    id: 'gabor',
    name: 'Gabor',
    description:
      'Sparse convolution of Gabor kernels — a Gaussian envelope times a harmonic, with hashed orientation, phase and weight per cell. After Lagae et al. (2009). The only band-limited basis here: envelope width and harmonic frequency set the spectrum directly, where Wave gets whatever spectrum the lattice gives it. The most expensive noise in the repo.',
    license: 'MIT (original implementation, algorithm after Lagae, Lefebvre, Drettakis & Dutre)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 6,
    variants: [
      {
        id: 'gabor-2d',
        label: '2D',
        dim: 2,
        sample: signedTs(GABOR2_NORM, gabor2),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * GABOR2_NORM * gabor2Tileable(x, y, px, py)),
        glsl: glslMain(2, [GABOR_GLSL], signedExpr(GABOR2_NORM, 'gabor2(p)')),
        glslTileable: glslMainT(2, [GABOR_TILEABLE_GLSL], signedExpr(GABOR2_NORM, 'gabor2T(p, per)')),
        wgsl: wgslMain(2, [GABOR_WGSL], signedExpr(GABOR2_NORM, 'gabor2(p)')),
        wgslTileable: wgslMainT(2, [GABOR_TILEABLE_WGSL], signedExpr(GABOR2_NORM, 'gabor2T(p, per)')),
      },
      {
        id: 'gabor-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(GABOR3_NORM, gabor3),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * GABOR3_NORM * gabor3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [GABOR_GLSL], signedExpr(GABOR3_NORM, 'gabor3(p)')),
        glslTileable: glslMainT(3, [GABOR_TILEABLE_GLSL], signedExpr(GABOR3_NORM, 'gabor3T(p, per)')),
        wgsl: wgslMain(3, [GABOR_WGSL], signedExpr(GABOR3_NORM, 'gabor3(p)')),
        wgslTileable: wgslMainT(3, [GABOR_TILEABLE_WGSL], signedExpr(GABOR3_NORM, 'gabor3T(p, per)')),
      },
    ],
  },
  {
    id: 'simplex-value',
    original: true,
    name: 'Simplex Value',
    description:
      'Original experiment (this repo): hashed values on the simplex lattice, kernel-weighted — 3 (2D) / 4 (3D) hashes, no gradients, no trig. Built for speed.',
    license: 'MIT (original experiment, lattice skew after Perlin/Gustavson)',
    tileable: true,
    tileableStrategy: 'torus',
    scale: 8,
    variants: [
      {
        id: 'simplex-value-2d',
        label: '2D',
        dim: 2,
        sample: signedTs(SIMPLEX_VALUE_NORM, simplexValue2),
        sampleTileable: (x, y, _z, px, py) =>
          clamp01(0.5 + 0.5 * SIMPLEX_VALUE4_NORM * simplexValue2TileableTorus(x, y, px, py)),
        glsl: glslMain(2, [SIMPLEX_VALUE_GLSL], signedExpr(SIMPLEX_VALUE_NORM, 'simplexValue2(p)')),
        glslTileable: glslMainT(
          2,
          [SIMPLEX_VALUE_TILEABLE_GLSL],
          signedExpr(SIMPLEX_VALUE4_NORM, 'simplexValue2T(p, per)'),
        ),
        wgsl: wgslMain(2, [SIMPLEX_VALUE_WGSL], signedExpr(SIMPLEX_VALUE_NORM, 'simplexValue2(p)')),
        wgslTileable: wgslMainT(
          2,
          [SIMPLEX_VALUE_TILEABLE_WGSL],
          signedExpr(SIMPLEX_VALUE4_NORM, 'simplexValue2T(p, per)'),
        ),
      },
      {
        id: 'simplex-value-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(SIMPLEX_VALUE_NORM, simplexValue3),
        sampleTileable: null,
        glsl: glslMain(3, [SIMPLEX_VALUE_GLSL], signedExpr(SIMPLEX_VALUE_NORM, 'simplexValue3(p)')),
        glslTileable: null,
        wgsl: wgslMain(3, [SIMPLEX_VALUE_WGSL], signedExpr(SIMPLEX_VALUE_NORM, 'simplexValue3(p)')),
        wgslTileable: null,
      },
    ],
  },
  {
    id: 'wave',
    original: true,
    name: 'Wave',
    description:
      'Original experiment (this repo): plane waves with hashed direction and phase at each lattice corner, quintic-blended. Fingerprint-like oriented interference; related in spirit to Gabor/phasor noise.',
    license: 'MIT (original experiment)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 6,
    variants: [
      {
        id: 'wave-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * wave2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * wave2Tileable(x, y, px, py)),
        glsl: glslMain(2, [WAVE_GLSL], 'clamp(0.5 + 0.5 * wave2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(2, [WAVE_GLSL, WAVE_TILEABLE_GLSL], 'clamp(0.5 + 0.5 * wave2T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(2, [WAVE_WGSL], 'clamp(0.5 + 0.5 * wave2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(2, [WAVE_WGSL, WAVE_TILEABLE_WGSL], 'clamp(0.5 + 0.5 * wave2T(p, per), 0.0, 1.0)'),
      },
      {
        id: 'wave-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(0.5 + 0.5 * wave3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * wave3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [WAVE_GLSL], 'clamp(0.5 + 0.5 * wave3(p), 0.0, 1.0)'),
        glslTileable: glslMainT(3, [WAVE_GLSL, WAVE_TILEABLE_GLSL], 'clamp(0.5 + 0.5 * wave3T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(3, [WAVE_WGSL], 'clamp(0.5 + 0.5 * wave3(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(3, [WAVE_WGSL, WAVE_TILEABLE_WGSL], 'clamp(0.5 + 0.5 * wave3T(p, per), 0.0, 1.0)'),
      },
    ],
  },
  {
    id: 'ripple',
    original: true,
    name: 'Ripple',
    description:
      'Original experiment (this repo): radial waves emitted from Worley-style feature points, windowed and summed. Water-drop interference; in 3D, rings bloom and fade as sources cross the z slice.',
    license: 'MIT (original experiment)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 6,
    variants: [
      {
        id: 'ripple-2d',
        label: '2D',
        dim: 2,
        sample: signedTs(RIPPLE_NORM, ripple2),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * RIPPLE_NORM * ripple2Tileable(x, y, px, py)),
        glsl: glslMain(2, [RIPPLE_GLSL], signedExpr(RIPPLE_NORM, 'ripple2(p)')),
        glslTileable: glslMainT(2, [RIPPLE_TILEABLE_GLSL], signedExpr(RIPPLE_NORM, 'ripple2T(p, per)')),
        wgsl: wgslMain(2, [RIPPLE_WGSL], signedExpr(RIPPLE_NORM, 'ripple2(p)')),
        wgslTileable: wgslMainT(2, [RIPPLE_TILEABLE_WGSL], signedExpr(RIPPLE_NORM, 'ripple2T(p, per)')),
      },
      {
        id: 'ripple-3d',
        label: '3D',
        dim: 3,
        sample: signedTs(RIPPLE_NORM, ripple3),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * RIPPLE_NORM * ripple3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [RIPPLE_GLSL], signedExpr(RIPPLE_NORM, 'ripple3(p)')),
        glslTileable: glslMainT(3, [RIPPLE_TILEABLE_GLSL], signedExpr(RIPPLE_NORM, 'ripple3T(p, per)')),
        wgsl: wgslMain(3, [RIPPLE_WGSL], signedExpr(RIPPLE_NORM, 'ripple3(p)')),
        wgslTileable: wgslMainT(3, [RIPPLE_TILEABLE_WGSL], signedExpr(RIPPLE_NORM, 'ripple3T(p, per)')),
      },
    ],
  },
  {
    id: 'marble',
    name: 'Marble',
    description:
      'Classic marble: cos(x + turbulence), 3 octaves of |Perlin| bending straight bands into veins. After Ken Perlin (1985, unpatented). Tiling requires an even period.',
    license: 'MIT (original implementation, formula after Ken Perlin 1985)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'marble-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * marble2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * marble2Tileable(x, y, px, py)),
        glsl: glslMain(2, [PERLIN_GLSL, PERLIN_DERIVED_GLSL], 'clamp(0.5 + 0.5 * marble2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(
          2,
          [PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
          'clamp(0.5 + 0.5 * marble2T(p, per), 0.0, 1.0)',
        ),
        wgsl: wgslMain(2, [PERLIN_WGSL, PERLIN_DERIVED_WGSL], 'clamp(0.5 + 0.5 * marble2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(
          2,
          [PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
          'clamp(0.5 + 0.5 * marble2T(p, per), 0.0, 1.0)',
        ),
      },
      {
        id: 'marble-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(0.5 + 0.5 * marble3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * marble3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [PERLIN_GLSL, PERLIN_DERIVED_GLSL], 'clamp(0.5 + 0.5 * marble3(p), 0.0, 1.0)'),
        glslTileable: glslMainT(
          3,
          [PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
          'clamp(0.5 + 0.5 * marble3T(p, per), 0.0, 1.0)',
        ),
        wgsl: wgslMain(3, [PERLIN_WGSL, PERLIN_DERIVED_WGSL], 'clamp(0.5 + 0.5 * marble3(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(
          3,
          [PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
          'clamp(0.5 + 0.5 * marble3T(p, per), 0.0, 1.0)',
        ),
      },
    ],
  },
  {
    id: 'contour',
    name: 'Contour',
    description:
      'Iso-line bands: cos(12 · Perlin). Topographic-map contours that merge and split. "Sine of noise" shader folklore (no known patent).',
    license: 'MIT (original implementation, folklore technique)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 6,
    variants: [
      {
        id: 'contour-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * contour2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * contour2Tileable(x, y, px, py)),
        glsl: glslMain(2, [PERLIN_GLSL, PERLIN_DERIVED_GLSL], 'clamp(0.5 + 0.5 * contour2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(
          2,
          [PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
          'clamp(0.5 + 0.5 * contour2T(p, per), 0.0, 1.0)',
        ),
        wgsl: wgslMain(2, [PERLIN_WGSL, PERLIN_DERIVED_WGSL], 'clamp(0.5 + 0.5 * contour2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(
          2,
          [PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
          'clamp(0.5 + 0.5 * contour2T(p, per), 0.0, 1.0)',
        ),
      },
      {
        id: 'contour-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(0.5 + 0.5 * contour3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * contour3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [PERLIN_GLSL, PERLIN_DERIVED_GLSL], 'clamp(0.5 + 0.5 * contour3(p), 0.0, 1.0)'),
        glslTileable: glslMainT(
          3,
          [PERLIN_GLSL, PERLIN_TILEABLE_GLSL, PERLIN_DERIVED_TILEABLE_GLSL],
          'clamp(0.5 + 0.5 * contour3T(p, per), 0.0, 1.0)',
        ),
        wgsl: wgslMain(3, [PERLIN_WGSL, PERLIN_DERIVED_WGSL], 'clamp(0.5 + 0.5 * contour3(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(
          3,
          [PERLIN_WGSL, PERLIN_TILEABLE_WGSL, PERLIN_DERIVED_TILEABLE_WGSL],
          'clamp(0.5 + 0.5 * contour3T(p, per), 0.0, 1.0)',
        ),
      },
    ],
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    description:
      'Flat shading by the nearest feature point hash ("Voronoi id"). Stained-glass cell mosaic, discontinuous at boundaries by design. Worley-folklore variant (no known patent).',
    license: 'MIT (original implementation, cellular basis by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'mosaic-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => mosaic2(x, y),
        sampleTileable: (x, y, _z, px, py) => mosaic2Tileable(x, y, px, py),
        glsl: glslMain(2, [CELLULAR_GLSL], 'mosaic2(p)'),
        glslTileable: glslMainT(2, [CELLULAR_TILEABLE_GLSL], 'mosaic2T(p, per)'),
        wgsl: wgslMain(2, [CELLULAR_WGSL], 'mosaic2(p)'),
        wgslTileable: wgslMainT(2, [CELLULAR_TILEABLE_WGSL], 'mosaic2T(p, per)'),
      },
      {
        id: 'mosaic-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => mosaic3(x, y, z),
        sampleTileable: (x, y, z, px, py) => mosaic3Tileable(x, y, z, px, py),
        glsl: glslMain(3, [CELLULAR_GLSL], 'mosaic3(p)'),
        glslTileable: glslMainT(3, [CELLULAR_TILEABLE_GLSL], 'mosaic3T(p, per)'),
        wgsl: wgslMain(3, [CELLULAR_WGSL], 'mosaic3(p)'),
        wgslTileable: wgslMainT(3, [CELLULAR_TILEABLE_WGSL], 'mosaic3T(p, per)'),
      },
    ],
  },
  {
    id: 'crackle',
    name: 'Crackle',
    description:
      'Worley F2 − F1: distance to second-nearest minus nearest feature point. Dark cracks along cell boundaries. Variant suggested in Worley’s 1996 paper (no known patent).',
    license: 'MIT (original implementation, algorithm by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'crackle-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(CRACKLE_NORM * crackle2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(CRACKLE_NORM * crackle2Tileable(x, y, px, py)),
        glsl: glslMain(2, [CELLULAR_GLSL], `clamp(${fmt(CRACKLE_NORM)} * crackle2(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          2,
          [CELLULAR_TILEABLE_GLSL],
          `clamp(${fmt(CRACKLE_NORM)} * crackle2T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(2, [CELLULAR_WGSL], `clamp(${fmt(CRACKLE_NORM)} * crackle2(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          2,
          [CELLULAR_TILEABLE_WGSL],
          `clamp(${fmt(CRACKLE_NORM)} * crackle2T(p, per), 0.0, 1.0)`,
        ),
      },
      {
        id: 'crackle-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(CRACKLE_NORM * crackle3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(CRACKLE_NORM * crackle3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [CELLULAR_GLSL], `clamp(${fmt(CRACKLE_NORM)} * crackle3(p), 0.0, 1.0)`),
        glslTileable: glslMainT(
          3,
          [CELLULAR_TILEABLE_GLSL],
          `clamp(${fmt(CRACKLE_NORM)} * crackle3T(p, per), 0.0, 1.0)`,
        ),
        wgsl: wgslMain(3, [CELLULAR_WGSL], `clamp(${fmt(CRACKLE_NORM)} * crackle3(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(
          3,
          [CELLULAR_TILEABLE_WGSL],
          `clamp(${fmt(CRACKLE_NORM)} * crackle3T(p, per), 0.0, 1.0)`,
        ),
      },
    ],
  },
  {
    id: 'foam',
    original: true,
    name: 'Foam',
    description:
      'Original experiment (this repo): max of spherical domes √(R²−d²) over feature points. Overlapping soap-bubble caps. Related to metaball/sparse-convolution folklore (J.P. Lewis, no known patent).',
    license: 'MIT (original experiment, cellular basis by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'foam-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => foam2(x, y),
        sampleTileable: (x, y, _z, px, py) => foam2Tileable(x, y, px, py),
        glsl: glslMain(2, [CELLULAR_GLSL], 'foam2(p)'),
        glslTileable: glslMainT(2, [CELLULAR_TILEABLE_GLSL], 'foam2T(p, per)'),
        wgsl: wgslMain(2, [CELLULAR_WGSL], 'foam2(p)'),
        wgslTileable: wgslMainT(2, [CELLULAR_TILEABLE_WGSL], 'foam2T(p, per)'),
      },
      {
        id: 'foam-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => foam3(x, y, z),
        sampleTileable: (x, y, z, px, py) => foam3Tileable(x, y, z, px, py),
        glsl: glslMain(3, [CELLULAR_GLSL], 'foam3(p)'),
        glslTileable: glslMainT(3, [CELLULAR_TILEABLE_GLSL], 'foam3T(p, per)'),
        wgsl: wgslMain(3, [CELLULAR_WGSL], 'foam3(p)'),
        wgslTileable: wgslMainT(3, [CELLULAR_TILEABLE_WGSL], 'foam3T(p, per)'),
      },
    ],
  },
  {
    id: 'stars',
    original: true,
    name: 'Stars',
    description:
      'Original experiment (this repo): Gaussian splats exp(−18d²) with hashed brightness summed over feature points. Drifting starfield; sources cross the z slice in 3D. Splatting folklore, cellular basis by Worley.',
    license: 'MIT (original experiment, cellular basis by Steven Worley)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'stars-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(STARS_NORM * stars2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(STARS_NORM * stars2Tileable(x, y, px, py)),
        glsl: glslMain(2, [CELLULAR_GLSL], `clamp(${fmt(STARS_NORM)} * stars2(p), 0.0, 1.0)`),
        glslTileable: glslMainT(2, [CELLULAR_TILEABLE_GLSL], `clamp(${fmt(STARS_NORM)} * stars2T(p, per), 0.0, 1.0)`),
        wgsl: wgslMain(2, [CELLULAR_WGSL], `clamp(${fmt(STARS_NORM)} * stars2(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(2, [CELLULAR_TILEABLE_WGSL], `clamp(${fmt(STARS_NORM)} * stars2T(p, per), 0.0, 1.0)`),
      },
      {
        id: 'stars-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(STARS_NORM * stars3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(STARS_NORM * stars3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [CELLULAR_GLSL], `clamp(${fmt(STARS_NORM)} * stars3(p), 0.0, 1.0)`),
        glslTileable: glslMainT(3, [CELLULAR_TILEABLE_GLSL], `clamp(${fmt(STARS_NORM)} * stars3T(p, per), 0.0, 1.0)`),
        wgsl: wgslMain(3, [CELLULAR_WGSL], `clamp(${fmt(STARS_NORM)} * stars3(p), 0.0, 1.0)`),
        wgslTileable: wgslMainT(3, [CELLULAR_TILEABLE_WGSL], `clamp(${fmt(STARS_NORM)} * stars3T(p, per), 0.0, 1.0)`),
      },
    ],
  },
  {
    id: 'vortex',
    original: true,
    name: 'Vortex',
    description:
      'Original experiment (this repo): hashed unit vectors at lattice corners are quintic-blended and the angle of the blend is shown as cos(2θ) — smooth swirls with pinwheel singularities where vectors cancel. Lattice structure after Perlin (unpatented).',
    license: 'MIT (original experiment)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'vortex-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * vortex2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * vortex2Tileable(x, y, px, py)),
        glsl: glslMain(2, [VORTEX_GLSL], 'clamp(0.5 + 0.5 * vortex2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(2, [VORTEX_TILEABLE_GLSL], 'clamp(0.5 + 0.5 * vortex2T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(2, [VORTEX_WGSL], 'clamp(0.5 + 0.5 * vortex2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(2, [VORTEX_TILEABLE_WGSL], 'clamp(0.5 + 0.5 * vortex2T(p, per), 0.0, 1.0)'),
      },
      {
        id: 'vortex-3d',
        label: '3D',
        dim: 3,
        sample: (x, y, z) => clamp01(0.5 + 0.5 * vortex3(x, y, z)),
        sampleTileable: (x, y, z, px, py) => clamp01(0.5 + 0.5 * vortex3Tileable(x, y, z, px, py)),
        glsl: glslMain(3, [VORTEX_GLSL], 'clamp(0.5 + 0.5 * vortex3(p), 0.0, 1.0)'),
        glslTileable: glslMainT(3, [VORTEX_TILEABLE_GLSL], 'clamp(0.5 + 0.5 * vortex3T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(3, [VORTEX_WGSL], 'clamp(0.5 + 0.5 * vortex3(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(3, [VORTEX_TILEABLE_WGSL], 'clamp(0.5 + 0.5 * vortex3T(p, per), 0.0, 1.0)'),
      },
    ],
  },
  {
    id: 'truchet',
    name: 'Truchet',
    description:
      'Ring bands along random Truchet arc tiles — meandering connected pipes. Tiles after Sébastien Truchet (1704) / C.S. Smith (1987), public domain; arc-distance shading is shader folklore (no known patent). 2D only.',
    license: 'MIT (original implementation, Truchet tiling is public domain)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      {
        id: 'truchet-2d',
        label: '2D',
        dim: 2,
        sample: (x, y) => clamp01(0.5 + 0.5 * truchet2(x, y)),
        sampleTileable: (x, y, _z, px, py) => clamp01(0.5 + 0.5 * truchet2Tileable(x, y, px, py)),
        glsl: glslMain(2, [TRUCHET_GLSL], 'clamp(0.5 + 0.5 * truchet2(p), 0.0, 1.0)'),
        glslTileable: glslMainT(2, [TRUCHET_TILEABLE_GLSL], 'clamp(0.5 + 0.5 * truchet2T(p, per), 0.0, 1.0)'),
        wgsl: wgslMain(2, [TRUCHET_WGSL], 'clamp(0.5 + 0.5 * truchet2(p), 0.0, 1.0)'),
        wgslTileable: wgslMainT(2, [TRUCHET_TILEABLE_WGSL], 'clamp(0.5 + 0.5 * truchet2T(p, per), 0.0, 1.0)'),
      },
    ],
  },
]

export const NOISES: NoiseDef[] = RAW_NOISES.map(n => ({
  ...n,
  variants: n.variants.map(v => ({ ...v, ...getTslSpec(v.id) })),
}))

export const getNoise = (id: string): NoiseDef | undefined => NOISES.find(n => n.id === id)

export const getVariant = (noise: NoiseDef, variantId: string): NoiseVariant =>
  noise.variants.find(v => v.id === variantId) ?? (noise.variants[noise.variants.length - 1] as NoiseVariant)

/** Default variant: 3D when available. */
export const defaultVariant = (noise: NoiseDef): NoiseVariant =>
  noise.variants.find(v => v.dim === 3) ?? (noise.variants[0] as NoiseVariant)
