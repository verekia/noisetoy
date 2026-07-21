// The explorer's registry of all noises: UI metadata (names, descriptions,
// licenses, tiling strategy, default lattice scale) plus, per variant, the
// per-backend NoiseSource assembled from the library's qualified exports and
// uniform-arity sampler conveniences for previews and benchmarks.
//
// This used to live in the library; it moved here when `noisetoy` became
// individual-function exports only. The library ships functions, the app owns
// the catalog.

import * as n from 'noisetoy'

import type { NoiseSource } from 'noisetoy'

export type Backend = 'js' | 'webgl' | 'webgpu' | 'three'

export type SampleFn = (x: number, y: number, z: number) => number
export type SampleTileableFn = (x: number, y: number, z: number, px: number, py: number) => number

export type NoiseVariant = {
  id: string
  label: string
  dim: 2 | 3
  /** The per-backend pieces, ready to hand to a createEffect layer. */
  source: NoiseSource
  /** Display sample, clamped to [0, 1]; uniform (x, y, z) arity. */
  sample: SampleFn
  sampleTileable: SampleTileableFn | null
  /** Pre-clamp display value; what the fractal operator folds per octave. */
  sampleRaw: SampleFn
  sampleRawTileable: SampleTileableFn | null
}

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
  /** Lattice cells across one tile at scale multiplier 1; also the tiling period. */
  scale: number
  variants: NoiseVariant[]
}

/** Wraps a NoiseSource with the uniform-arity, clamped/raw sampler conveniences. */
const variant = (id: string, label: string, source: NoiseSource): NoiseVariant => {
  let sampleRaw: SampleFn
  let sampleRawTileable: SampleTileableFn | null = null
  if (source.dim === 2) {
    const { sample, sampleTileable } = source
    if (!sample) throw new Error(`${id}: source has no CPU sampler`)
    sampleRaw = (x, y) => sample(x, y)
    if (sampleTileable) sampleRawTileable = (x, y, _z, px, py) => sampleTileable(x, y, px, py)
  } else {
    const { sample, sampleTileable } = source
    if (!sample) throw new Error(`${id}: source has no CPU sampler`)
    sampleRaw = sample
    sampleRawTileable = sampleTileable ?? null
  }
  const rawT = sampleRawTileable
  return {
    id,
    label,
    dim: source.dim,
    source,
    sampleRaw,
    sampleRawTileable,
    sample: (x, y, z) => n.clamp01(sampleRaw(x, y, z)),
    sampleTileable: rawT ? (x, y, z, px, py) => n.clamp01(rawT(x, y, z, px, py)) : null,
  }
}

export const NOISES: NoiseDef[] = [
  {
    id: 'value',
    name: 'Value',
    description: 'Random values on an integer lattice, quintic-smoothed interpolation.',
    license: 'MIT (original implementation)',
    tileable: true,
    tileableStrategy: 'lattice-wrap',
    scale: 8,
    variants: [
      variant('value-2d', '2D', {
        dim: 2,
        sample: n.value2dCanonical,
        sampleTileable: n.value2dCanonicalTileable,
        glsl: n.value2dCanonicalGlsl,
        glslTileable: n.value2dCanonicalTileableGlsl,
        wgsl: n.value2dCanonicalWgsl,
        wgslTileable: n.value2dCanonicalTileableWgsl,
        tsl: n.value2dCanonicalTsl,
        tslTileable: n.value2dCanonicalTileableTsl,
      }),
      variant('value-3d', '3D', {
        dim: 3,
        sample: n.value3dCanonical,
        sampleTileable: n.value3dCanonicalTileable,
        glsl: n.value3dCanonicalGlsl,
        glslTileable: n.value3dCanonicalTileableGlsl,
        wgsl: n.value3dCanonicalWgsl,
        wgslTileable: n.value3dCanonicalTileableWgsl,
        tsl: n.value3dCanonicalTsl,
        tslTileable: n.value3dCanonicalTileableTsl,
      }),
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
      variant('white-2d', '2D', {
        dim: 2,
        sample: n.white2dCanonical,
        sampleTileable: n.white2dCanonicalTileable,
        glsl: n.white2dCanonicalGlsl,
        glslTileable: n.white2dCanonicalTileableGlsl,
        wgsl: n.white2dCanonicalWgsl,
        wgslTileable: n.white2dCanonicalTileableWgsl,
        tsl: n.white2dCanonicalTsl,
        tslTileable: n.white2dCanonicalTileableTsl,
      }),
      variant('white-3d', '3D', {
        dim: 3,
        sample: n.white3dCanonical,
        sampleTileable: n.white3dCanonicalTileable,
        glsl: n.white3dCanonicalGlsl,
        glslTileable: n.white3dCanonicalTileableGlsl,
        wgsl: n.white3dCanonicalWgsl,
        wgslTileable: n.white3dCanonicalTileableWgsl,
        tsl: n.white3dCanonicalTsl,
        tslTileable: n.white3dCanonicalTileableTsl,
      }),
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
      variant('perlin-2d', '2D', {
        dim: 2,
        sample: n.perlin2dCanonical,
        sampleTileable: n.perlin2dCanonicalTileable,
        glsl: n.perlin2dCanonicalGlsl,
        glslTileable: n.perlin2dCanonicalTileableGlsl,
        wgsl: n.perlin2dCanonicalWgsl,
        wgslTileable: n.perlin2dCanonicalTileableWgsl,
        tsl: n.perlin2dCanonicalTsl,
        tslTileable: n.perlin2dCanonicalTileableTsl,
      }),
      variant('perlin-3d', '3D', {
        dim: 3,
        sample: n.perlin3dCanonical,
        sampleTileable: n.perlin3dCanonicalTileable,
        glsl: n.perlin3dCanonicalGlsl,
        glslTileable: n.perlin3dCanonicalTileableGlsl,
        wgsl: n.perlin3dCanonicalWgsl,
        wgslTileable: n.perlin3dCanonicalTileableWgsl,
        tsl: n.perlin3dCanonicalTsl,
        tslTileable: n.perlin3dCanonicalTileableTsl,
      }),
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
      variant('flow-3d', '3D', {
        dim: 3,
        sample: n.flow3dCanonical,
        sampleTileable: n.flow3dCanonicalTileable,
        glsl: n.flow3dCanonicalGlsl,
        glslTileable: n.flow3dCanonicalTileableGlsl,
        wgsl: n.flow3dCanonicalWgsl,
        wgslTileable: n.flow3dCanonicalTileableWgsl,
        tsl: n.flow3dCanonicalTsl,
        tslTileable: n.flow3dCanonicalTileableTsl,
      }),
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
      variant('simplex-2d', '2D', {
        dim: 2,
        sample: n.simplex2dCanonical,
        sampleTileable: n.simplex2dCanonicalTileable,
        glsl: n.simplex2dCanonicalGlsl,
        glslTileable: n.simplex2dCanonicalTileableGlsl,
        wgsl: n.simplex2dCanonicalWgsl,
        wgslTileable: n.simplex2dCanonicalTileableWgsl,
        tsl: n.simplex2dCanonicalTsl,
        tslTileable: n.simplex2dCanonicalTileableTsl,
      }),
      variant('simplex-3d', '3D', {
        dim: 3,
        sample: n.simplex3dCanonical,
        glsl: n.simplex3dCanonicalGlsl,
        wgsl: n.simplex3dCanonicalWgsl,
        tsl: n.simplex3dCanonicalTsl,
      }),
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
      variant('simplex-loop-3d', '3D', {
        dim: 3,
        sample: n.simplexLoop3dCanonical,
        glsl: n.simplexLoop3dCanonicalGlsl,
        wgsl: n.simplexLoop3dCanonicalWgsl,
        tsl: n.simplexLoop3dCanonicalTsl,
      }),
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
      variant('worley-2d', '2D', {
        dim: 2,
        sample: n.worley2dCanonical,
        sampleTileable: n.worley2dCanonicalTileable,
        glsl: n.worley2dCanonicalGlsl,
        glslTileable: n.worley2dCanonicalTileableGlsl,
        wgsl: n.worley2dCanonicalWgsl,
        wgslTileable: n.worley2dCanonicalTileableWgsl,
        tsl: n.worley2dCanonicalTsl,
        tslTileable: n.worley2dCanonicalTileableTsl,
      }),
      variant('worley-3d', '3D', {
        dim: 3,
        sample: n.worley3dCanonical,
        sampleTileable: n.worley3dCanonicalTileable,
        glsl: n.worley3dCanonicalGlsl,
        glslTileable: n.worley3dCanonicalTileableGlsl,
        wgsl: n.worley3dCanonicalWgsl,
        wgslTileable: n.worley3dCanonicalTileableWgsl,
        tsl: n.worley3dCanonicalTsl,
        tslTileable: n.worley3dCanonicalTileableTsl,
      }),
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
      variant('worley-manhattan-2d', '2D', {
        dim: 2,
        sample: n.worleyManhattan2dCanonical,
        sampleTileable: n.worleyManhattan2dCanonicalTileable,
        glsl: n.worleyManhattan2dCanonicalGlsl,
        glslTileable: n.worleyManhattan2dCanonicalTileableGlsl,
        wgsl: n.worleyManhattan2dCanonicalWgsl,
        wgslTileable: n.worleyManhattan2dCanonicalTileableWgsl,
        tsl: n.worleyManhattan2dCanonicalTsl,
        tslTileable: n.worleyManhattan2dCanonicalTileableTsl,
      }),
      variant('worley-manhattan-3d', '3D', {
        dim: 3,
        sample: n.worleyManhattan3dCanonical,
        sampleTileable: n.worleyManhattan3dCanonicalTileable,
        glsl: n.worleyManhattan3dCanonicalGlsl,
        glslTileable: n.worleyManhattan3dCanonicalTileableGlsl,
        wgsl: n.worleyManhattan3dCanonicalWgsl,
        wgslTileable: n.worleyManhattan3dCanonicalTileableWgsl,
        tsl: n.worleyManhattan3dCanonicalTsl,
        tslTileable: n.worleyManhattan3dCanonicalTileableTsl,
      }),
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
      variant('worley-chebyshev-2d', '2D', {
        dim: 2,
        sample: n.worleyChebyshev2dCanonical,
        sampleTileable: n.worleyChebyshev2dCanonicalTileable,
        glsl: n.worleyChebyshev2dCanonicalGlsl,
        glslTileable: n.worleyChebyshev2dCanonicalTileableGlsl,
        wgsl: n.worleyChebyshev2dCanonicalWgsl,
        wgslTileable: n.worleyChebyshev2dCanonicalTileableWgsl,
        tsl: n.worleyChebyshev2dCanonicalTsl,
        tslTileable: n.worleyChebyshev2dCanonicalTileableTsl,
      }),
      variant('worley-chebyshev-3d', '3D', {
        dim: 3,
        sample: n.worleyChebyshev3dCanonical,
        sampleTileable: n.worleyChebyshev3dCanonicalTileable,
        glsl: n.worleyChebyshev3dCanonicalGlsl,
        glslTileable: n.worleyChebyshev3dCanonicalTileableGlsl,
        wgsl: n.worleyChebyshev3dCanonicalWgsl,
        wgslTileable: n.worleyChebyshev3dCanonicalTileableWgsl,
        tsl: n.worleyChebyshev3dCanonicalTsl,
        tslTileable: n.worleyChebyshev3dCanonicalTileableTsl,
      }),
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
      variant('gabor-2d', '2D', {
        dim: 2,
        sample: n.gabor2dCanonical,
        sampleTileable: n.gabor2dCanonicalTileable,
        glsl: n.gabor2dCanonicalGlsl,
        glslTileable: n.gabor2dCanonicalTileableGlsl,
        wgsl: n.gabor2dCanonicalWgsl,
        wgslTileable: n.gabor2dCanonicalTileableWgsl,
        tsl: n.gabor2dCanonicalTsl,
        tslTileable: n.gabor2dCanonicalTileableTsl,
      }),
      variant('gabor-3d', '3D', {
        dim: 3,
        sample: n.gabor3dCanonical,
        sampleTileable: n.gabor3dCanonicalTileable,
        glsl: n.gabor3dCanonicalGlsl,
        glslTileable: n.gabor3dCanonicalTileableGlsl,
        wgsl: n.gabor3dCanonicalWgsl,
        wgslTileable: n.gabor3dCanonicalTileableWgsl,
        tsl: n.gabor3dCanonicalTsl,
        tslTileable: n.gabor3dCanonicalTileableTsl,
      }),
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
      variant('simplex-value-2d', '2D', {
        dim: 2,
        sample: n.simplexValue2dCanonical,
        sampleTileable: n.simplexValue2dCanonicalTileable,
        glsl: n.simplexValue2dCanonicalGlsl,
        glslTileable: n.simplexValue2dCanonicalTileableGlsl,
        wgsl: n.simplexValue2dCanonicalWgsl,
        wgslTileable: n.simplexValue2dCanonicalTileableWgsl,
        tsl: n.simplexValue2dCanonicalTsl,
        tslTileable: n.simplexValue2dCanonicalTileableTsl,
      }),
      variant('simplex-value-3d', '3D', {
        dim: 3,
        sample: n.simplexValue3dCanonical,
        glsl: n.simplexValue3dCanonicalGlsl,
        wgsl: n.simplexValue3dCanonicalWgsl,
        tsl: n.simplexValue3dCanonicalTsl,
      }),
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
      variant('wave-2d', '2D', {
        dim: 2,
        sample: n.wave2dCanonical,
        sampleTileable: n.wave2dCanonicalTileable,
        glsl: n.wave2dCanonicalGlsl,
        glslTileable: n.wave2dCanonicalTileableGlsl,
        wgsl: n.wave2dCanonicalWgsl,
        wgslTileable: n.wave2dCanonicalTileableWgsl,
        tsl: n.wave2dCanonicalTsl,
        tslTileable: n.wave2dCanonicalTileableTsl,
      }),
      variant('wave-3d', '3D', {
        dim: 3,
        sample: n.wave3dCanonical,
        sampleTileable: n.wave3dCanonicalTileable,
        glsl: n.wave3dCanonicalGlsl,
        glslTileable: n.wave3dCanonicalTileableGlsl,
        wgsl: n.wave3dCanonicalWgsl,
        wgslTileable: n.wave3dCanonicalTileableWgsl,
        tsl: n.wave3dCanonicalTsl,
        tslTileable: n.wave3dCanonicalTileableTsl,
      }),
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
      variant('ripple-2d', '2D', {
        dim: 2,
        sample: n.ripple2dCanonical,
        sampleTileable: n.ripple2dCanonicalTileable,
        glsl: n.ripple2dCanonicalGlsl,
        glslTileable: n.ripple2dCanonicalTileableGlsl,
        wgsl: n.ripple2dCanonicalWgsl,
        wgslTileable: n.ripple2dCanonicalTileableWgsl,
        tsl: n.ripple2dCanonicalTsl,
        tslTileable: n.ripple2dCanonicalTileableTsl,
      }),
      variant('ripple-3d', '3D', {
        dim: 3,
        sample: n.ripple3dCanonical,
        sampleTileable: n.ripple3dCanonicalTileable,
        glsl: n.ripple3dCanonicalGlsl,
        glslTileable: n.ripple3dCanonicalTileableGlsl,
        wgsl: n.ripple3dCanonicalWgsl,
        wgslTileable: n.ripple3dCanonicalTileableWgsl,
        tsl: n.ripple3dCanonicalTsl,
        tslTileable: n.ripple3dCanonicalTileableTsl,
      }),
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
      variant('marble-2d', '2D', {
        dim: 2,
        sample: n.marble2dCanonical,
        sampleTileable: n.marble2dCanonicalTileable,
        glsl: n.marble2dCanonicalGlsl,
        glslTileable: n.marble2dCanonicalTileableGlsl,
        wgsl: n.marble2dCanonicalWgsl,
        wgslTileable: n.marble2dCanonicalTileableWgsl,
        tsl: n.marble2dCanonicalTsl,
        tslTileable: n.marble2dCanonicalTileableTsl,
      }),
      variant('marble-3d', '3D', {
        dim: 3,
        sample: n.marble3dCanonical,
        sampleTileable: n.marble3dCanonicalTileable,
        glsl: n.marble3dCanonicalGlsl,
        glslTileable: n.marble3dCanonicalTileableGlsl,
        wgsl: n.marble3dCanonicalWgsl,
        wgslTileable: n.marble3dCanonicalTileableWgsl,
        tsl: n.marble3dCanonicalTsl,
        tslTileable: n.marble3dCanonicalTileableTsl,
      }),
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
      variant('contour-2d', '2D', {
        dim: 2,
        sample: n.contour2dCanonical,
        sampleTileable: n.contour2dCanonicalTileable,
        glsl: n.contour2dCanonicalGlsl,
        glslTileable: n.contour2dCanonicalTileableGlsl,
        wgsl: n.contour2dCanonicalWgsl,
        wgslTileable: n.contour2dCanonicalTileableWgsl,
        tsl: n.contour2dCanonicalTsl,
        tslTileable: n.contour2dCanonicalTileableTsl,
      }),
      variant('contour-3d', '3D', {
        dim: 3,
        sample: n.contour3dCanonical,
        sampleTileable: n.contour3dCanonicalTileable,
        glsl: n.contour3dCanonicalGlsl,
        glslTileable: n.contour3dCanonicalTileableGlsl,
        wgsl: n.contour3dCanonicalWgsl,
        wgslTileable: n.contour3dCanonicalTileableWgsl,
        tsl: n.contour3dCanonicalTsl,
        tslTileable: n.contour3dCanonicalTileableTsl,
      }),
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
      variant('mosaic-2d', '2D', {
        dim: 2,
        sample: n.mosaic2dCanonical,
        sampleTileable: n.mosaic2dCanonicalTileable,
        glsl: n.mosaic2dCanonicalGlsl,
        glslTileable: n.mosaic2dCanonicalTileableGlsl,
        wgsl: n.mosaic2dCanonicalWgsl,
        wgslTileable: n.mosaic2dCanonicalTileableWgsl,
        tsl: n.mosaic2dCanonicalTsl,
        tslTileable: n.mosaic2dCanonicalTileableTsl,
      }),
      variant('mosaic-3d', '3D', {
        dim: 3,
        sample: n.mosaic3dCanonical,
        sampleTileable: n.mosaic3dCanonicalTileable,
        glsl: n.mosaic3dCanonicalGlsl,
        glslTileable: n.mosaic3dCanonicalTileableGlsl,
        wgsl: n.mosaic3dCanonicalWgsl,
        wgslTileable: n.mosaic3dCanonicalTileableWgsl,
        tsl: n.mosaic3dCanonicalTsl,
        tslTileable: n.mosaic3dCanonicalTileableTsl,
      }),
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
      variant('crackle-2d', '2D', {
        dim: 2,
        sample: n.crackle2dCanonical,
        sampleTileable: n.crackle2dCanonicalTileable,
        glsl: n.crackle2dCanonicalGlsl,
        glslTileable: n.crackle2dCanonicalTileableGlsl,
        wgsl: n.crackle2dCanonicalWgsl,
        wgslTileable: n.crackle2dCanonicalTileableWgsl,
        tsl: n.crackle2dCanonicalTsl,
        tslTileable: n.crackle2dCanonicalTileableTsl,
      }),
      variant('crackle-3d', '3D', {
        dim: 3,
        sample: n.crackle3dCanonical,
        sampleTileable: n.crackle3dCanonicalTileable,
        glsl: n.crackle3dCanonicalGlsl,
        glslTileable: n.crackle3dCanonicalTileableGlsl,
        wgsl: n.crackle3dCanonicalWgsl,
        wgslTileable: n.crackle3dCanonicalTileableWgsl,
        tsl: n.crackle3dCanonicalTsl,
        tslTileable: n.crackle3dCanonicalTileableTsl,
      }),
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
      variant('foam-2d', '2D', {
        dim: 2,
        sample: n.foam2dCanonical,
        sampleTileable: n.foam2dCanonicalTileable,
        glsl: n.foam2dCanonicalGlsl,
        glslTileable: n.foam2dCanonicalTileableGlsl,
        wgsl: n.foam2dCanonicalWgsl,
        wgslTileable: n.foam2dCanonicalTileableWgsl,
        tsl: n.foam2dCanonicalTsl,
        tslTileable: n.foam2dCanonicalTileableTsl,
      }),
      variant('foam-3d', '3D', {
        dim: 3,
        sample: n.foam3dCanonical,
        sampleTileable: n.foam3dCanonicalTileable,
        glsl: n.foam3dCanonicalGlsl,
        glslTileable: n.foam3dCanonicalTileableGlsl,
        wgsl: n.foam3dCanonicalWgsl,
        wgslTileable: n.foam3dCanonicalTileableWgsl,
        tsl: n.foam3dCanonicalTsl,
        tslTileable: n.foam3dCanonicalTileableTsl,
      }),
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
      variant('stars-2d', '2D', {
        dim: 2,
        sample: n.stars2dCanonical,
        sampleTileable: n.stars2dCanonicalTileable,
        glsl: n.stars2dCanonicalGlsl,
        glslTileable: n.stars2dCanonicalTileableGlsl,
        wgsl: n.stars2dCanonicalWgsl,
        wgslTileable: n.stars2dCanonicalTileableWgsl,
        tsl: n.stars2dCanonicalTsl,
        tslTileable: n.stars2dCanonicalTileableTsl,
      }),
      variant('stars-3d', '3D', {
        dim: 3,
        sample: n.stars3dCanonical,
        sampleTileable: n.stars3dCanonicalTileable,
        glsl: n.stars3dCanonicalGlsl,
        glslTileable: n.stars3dCanonicalTileableGlsl,
        wgsl: n.stars3dCanonicalWgsl,
        wgslTileable: n.stars3dCanonicalTileableWgsl,
        tsl: n.stars3dCanonicalTsl,
        tslTileable: n.stars3dCanonicalTileableTsl,
      }),
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
      variant('vortex-2d', '2D', {
        dim: 2,
        sample: n.vortex2dCanonical,
        sampleTileable: n.vortex2dCanonicalTileable,
        glsl: n.vortex2dCanonicalGlsl,
        glslTileable: n.vortex2dCanonicalTileableGlsl,
        wgsl: n.vortex2dCanonicalWgsl,
        wgslTileable: n.vortex2dCanonicalTileableWgsl,
        tsl: n.vortex2dCanonicalTsl,
        tslTileable: n.vortex2dCanonicalTileableTsl,
      }),
      variant('vortex-3d', '3D', {
        dim: 3,
        sample: n.vortex3dCanonical,
        sampleTileable: n.vortex3dCanonicalTileable,
        glsl: n.vortex3dCanonicalGlsl,
        glslTileable: n.vortex3dCanonicalTileableGlsl,
        wgsl: n.vortex3dCanonicalWgsl,
        wgslTileable: n.vortex3dCanonicalTileableWgsl,
        tsl: n.vortex3dCanonicalTsl,
        tslTileable: n.vortex3dCanonicalTileableTsl,
      }),
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
      variant('truchet-2d', '2D', {
        dim: 2,
        sample: n.truchet2dCanonical,
        sampleTileable: n.truchet2dCanonicalTileable,
        glsl: n.truchet2dCanonicalGlsl,
        glslTileable: n.truchet2dCanonicalTileableGlsl,
        wgsl: n.truchet2dCanonicalWgsl,
        wgslTileable: n.truchet2dCanonicalTileableWgsl,
        tsl: n.truchet2dCanonicalTsl,
        tslTileable: n.truchet2dCanonicalTileableTsl,
      }),
    ],
  },
]

export const getNoise = (id: string): NoiseDef | undefined => NOISES.find(x => x.id === id)

export const getVariant = (noise: NoiseDef, variantId: string): NoiseVariant =>
  noise.variants.find(v => v.id === variantId) ?? (noise.variants[noise.variants.length - 1] as NoiseVariant)

/** Default variant: 3D when available. */
export const defaultVariant = (noise: NoiseDef): NoiseVariant =>
  noise.variants.find(v => v.dim === 3) ?? (noise.variants[0] as NoiseVariant)
