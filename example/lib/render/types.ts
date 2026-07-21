import type { NoiseSource } from 'noisetoy'

import type { Effect } from '../effect'

/**
 * Per-octave shaping of the fractal operator: 'basic' sums signed octaves
 * (fBm), 'billow' folds each octave's absolute value (puffy look), 'ridged'
 * inverts the fold with Musgrave-style spectral feedback (mountain-ridge
 * look: sharp detail on crests, calm basins).
 */
export type FractalStyle = 'basic' | 'billow' | 'ridged'

/**
 * Per-octave sample offset, in lattice cells, applied as octave x this vector
 * when a layer does NOT rotate its octaves. Octaves sample the same field at
 * exactly doubled frequency, so without an offset every lattice point of
 * octave o is also a lattice point of octave o+1 — and gradient noises are
 * exactly zero at all of them simultaneously, pinning the fractal to
 * mid-grey on a visible grid. A constant shift with a non-integer fractional
 * part breaks the alignment (integer shifts do not: lattice noises are zero
 * at lattice points whatever the hash cell). The stronger alternative,
 * rotating each octave (see OCTAVE_ROT2/3), cannot tile; offsets keep the
 * tiled and untiled paths identical. Fractional parts follow the golden
 * ratio so small octave multiples stay away from integers.
 */
export const OCTAVE_OFFSET: readonly [number, number, number] = [19.618, 27.236, 41.854]

/**
 * Rotated-octave frequency step of the `rotate` fractal option, row-major —
 * the classic shader-fBm construction popularised by Inigo Quilez
 * (iquilezles.org/articles/fbm): a rotation by atan(3/4) in 2D and by his
 * orthonormal m3 in 3D, both scaled by a lacunarity of 2.02. Rotation breaks
 * every lattice alignment between octaves, not just the zero-pinning the
 * offsets fix, but a rotated field has no period, so a rotated layer cannot
 * tile. The 1% detune off a lacunarity of 2 is load-bearing, not decoration:
 * the rotations are rational (built from 3-4-5 triangles), and at exactly 2
 * they map the lattice line (±5k, 0, 0) back into integer lattice points
 * forever, where every gradient-noise octave is exactly zero. The origin
 * itself remains a fixed point of any linear map, so a rotated fractal over
 * gradient noise is exactly mid-grey at the origin.
 */
export const OCTAVE_ROT2: readonly number[] = [1.616, 1.212, -1.212, 1.616]

export const OCTAVE_ROT3: readonly number[] = [0, -1.616, -1.212, 1.616, 0.7272, -0.9696, 1.212, -0.9696, 1.2928]

/**
 * Feedback strength of the 'ridged' style: each octave's signal is scaled by
 * the previous octave's signal (clamped to [0, 1]), after Musgrave's ridged
 * multifractal. 2 is Musgrave's published default. (Musgrave calls this knob
 * "gain"; the amplitude falloff here is fixed at the classic 0.5.)
 */
export const RIDGE_FEEDBACK = 2

/**
 * Per-octave amplitude falloff of the fractal operator, fixed at the classic
 * fBm value. Since it is fixed, the two normalizers below are closed forms of
 * the octave count alone and are precomputed instead of accumulated in the
 * octave loop.
 */
export const FRACTAL_GAIN = 0.5

/** Amplitude sum for N octaves: what 'billow' and 'ridged' divide by. */
export const fractalAmpSum = (octaves: number): number => 2 * (1 - 0.5 ** octaves)

/**
 * RMS amplitude (sqrt of the summed squared amplitudes) for N octaves: what
 * 'basic' divides by. Octaves are nearly independent, so variance adds, and
 * dividing by the RMS preserves the basis noise's display contrast at any
 * octave count. Dividing by the amplitude sum instead can never clip, but
 * washes the result toward mid-grey and makes octave count double as an
 * unwanted contrast knob; with the RMS the rarest extremes clip — the same
 * top-0.1% trade the calibrated display norms make.
 */
export const fractalRms = (octaves: number): number => Math.sqrt((1 - 0.25 ** octaves) / 0.75)

/**
 * How a layer combines with the accumulated result of the layers below it.
 * All are standard Photoshop-style grayscale blends except 'warp', which is
 * noise-native: the accumulated value displaces this layer's sampling
 * coordinates before it replaces the result (structural influence). Since the
 * displacement field is periodic when tiling, 'warp' preserves tiling.
 */
export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'difference'
  | 'darken'
  | 'lighten'
  | 'warp'

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  // 'Opacity' rather than 'Normal': with no blending maths of its own, this
  // mode is just the opacity slider, and that reads more intuitively.
  { id: 'normal', label: 'Opacity' },
  { id: 'add', label: 'Add' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'difference', label: 'Difference' },
  { id: 'darken', label: 'Darken' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'warp', label: 'Warp' },
]

/** Tiles per axis shown by the tiled preview: TILE_REPEAT^2 copies of one tile. */
export const TILE_REPEAT = 2

/** Max uv displacement applied by the 'warp' blend at accumulator extremes. */
export const WARP_BLEND_STRENGTH = 0.35

export const applyBlend = (mode: BlendMode, a: number, v: number): number => {
  switch (mode) {
    case 'add':
      return Math.min(a + v, 1)
    case 'multiply':
      return a * v
    case 'screen':
      return 1 - (1 - a) * (1 - v)
    case 'overlay':
      return a < 0.5 ? 2 * a * v : 1 - 2 * (1 - a) * (1 - v)
    case 'difference':
      return Math.abs(a - v)
    case 'darken':
      return Math.min(a, v)
    case 'lighten':
      return Math.max(a, v)
    default:
      return v // 'normal' and 'warp' (warp displaces before sampling)
  }
}

/**
 * How the effect is presented: '2d' paints it flat, 'plane' displaces the
 * vertices of a subdivided plane, and 'sphere' displaces a subdivided sphere
 * along its normals (both 3D modes are Three.js only).
 */
export type ViewMode = '2d' | 'plane' | 'sphere'

/** Plane-local displacement height at effect value 1 in the 3D view. */
export const DISPLACEMENT = 0.32

/** Subdivisions per side of the displaced plane in the 3D view. */
export const PLANE_SEGMENTS = 384

export type LayerConfig = {
  /**
   * The per-backend pieces of the layer's noise, assembled by the caller from
   * this package's per-variant exports. Only the backends actually rendered
   * need to be present; a missing backend throws when it is used.
   */
  noise: NoiseSource
  /**
   * Lattice cells across one tile for this layer; also its tiling period,
   * which the caller keeps integral when tiling.
   */
  scale: number
  /**
   * Fractal stacking applied on top of the noise — classic fBm: lacunarity 2,
   * gain FRACTAL_GAIN, per-octave decorrelation offsets, variance-preserving
   * normalization (see fractalRms). Octaves fold the noise's pre-clamp
   * display value and clamp once at the end, so no octave is clipped before
   * it is summed. This is a display-level operator kept out of the core noise
   * implementations.
   */
  octaves: number
  /**
   * Rotate each octave (OCTAVE_ROT2/3) instead of offsetting it — the classic
   * fBm construction. Inert at 1 octave; forces the layer off the tileable
   * code paths, since a rotated field has no period.
   */
  rotate: boolean
  style: FractalStyle
  /** Ignored for the bottom layer. */
  blend: BlendMode
  /** 0..1, mixes the blended result with the accumulator below. */
  opacity: number
  /**
   * Translation speed in canvas units per second (a speed of 1 crosses the
   * whole canvas in one second). Screen-relative on purpose: the visible
   * drift speed is the same at any layer scale and for any noise's lattice
   * density. 0 disables translation.
   */
  speed: number
  /** Translation heading in degrees: 0 is right, 90 is up (counter-clockwise). */
  angle: number
}

/**
 * Sampling offset per second for a translating layer, in lattice cells.
 * `speed` is screen-relative (canvas units per second), so the lattice
 * velocity is speed x the layer's lattice scale. The pattern appears to move
 * along `angle`, so the sampling point moves the other way; v points down,
 * which flips the y component back.
 */
export const translationVelocity = (speed: number, angle: number, scale: number): [number, number] => {
  if (!speed) return [0, 0]
  const rad = (angle * Math.PI) / 180
  return [-Math.cos(rad) * speed * scale, Math.sin(rad) * speed * scale]
}

/**
 * Where the stack is sampled. 'uv' walks a 2D plane — the default, used by
 * flat renders and uv-mapped meshes. 'position' samples 3D noise directly at a
 * point in space, which is seamless on any surface: no uv wrap, no pole
 * pinching. Layers whose variant is 2D-only fall back to the xy plane of that
 * point, so a fully seamless solid stack should use 3D variants.
 */
export type SampleDomain = 'uv' | 'position'

export type RenderConfig = {
  /** Bottom to top, Photoshop-style. */
  layers: LayerConfig[]
  /** When true, repeats one tile TILE_REPEAT x TILE_REPEAT through the tileable code paths. */
  tiled: boolean
  /** Square render resolution in pixels. */
  size: number
  /** Presentation mode; only the Three.js renderer honours the 3D modes. Defaults to '2d'. */
  view?: ViewMode
  /** Sampling domain. Defaults to 'uv'. Tiling does not apply to 'position'. */
  domain?: SampleDomain
  /**
   * Posterize the folded stack into this many evenly spaced levels, first at
   * exactly 0 and last at exactly 1. 0/undefined renders the smooth gradient.
   */
  steps?: number
  /** Band-edge ease fraction for stepped rendering. Default STEP_SMOOTHING. */
  stepSmoothing?: number
  /**
   * Isolate one value band: 1 where the folded stack lands inside
   * [center - width/2, center + width/2], 0 elsewhere. Mutually exclusive
   * with `steps`.
   */
  band?: { center: number; width: number }
  /** Absolute inside-edge ease width, in value units. Default BAND_SMOOTHING. */
  bandSmoothing?: number
}

/**
 * Fraction of a band over which stepped rendering eases into the next level
 * (smoothstep over the band's top). Hard steps alias badly along band
 * borders; screen-space derivative AA (fwidth) would be the precise fix but
 * exists only in fragment shaders — the effect also runs on the CPU and in
 * the vertex stage for 3D displacement — so the transition is a fixed
 * fraction of a band instead, keeping all four backends bit-consistent.
 * 0.03 is tuned by eye: crisp borders, no visible staircase at 1000px.
 *
 * This is the DEFAULT; EffectSpec.stepSmoothing overrides it per effect.
 * Displaced geometry needs a much wider ease than pixels do — a vertex grid
 * cannot resolve a near-vertical cliff, and triangles snapping to either side
 * of one produce sawtooth edges — so 3D views should render terraces with a
 * transition spanning several grid cells (~0.25).
 */
export const STEP_SMOOTHING = 0.03

/**
 * ABSOLUTE width, in value-range units, over which an isolated band eases
 * from 0 to 1 on the inside of each edge. Absolute, not a fraction of the
 * band, so Thin and Thick bands get the identical edge crispness — and the
 * identical crispness stepped rendering gets: STEP_SMOOTHING is 0.03 of a
 * level, which at the 4-level midpoint of the explorer's 2-8 range is
 * 0.03 / 4 = 0.0075 of the value range. Renders that displace geometry
 * should widen it the same way stepped mode does (0.25/4 and 0.4/4).
 * Clamped to half the band width at application, so a heavily eased narrow
 * band degrades into a smooth bump rather than inverting.
 *
 * This is the DEFAULT; EffectSpec.bandSmoothing overrides it per effect.
 */
export const BAND_SMOOTHING = 0.0075

export type Renderer = {
  render: (timeSec: number) => void
  dispose: () => void
  /** Adapts to a new canvas size without rebuilding the pipeline, when supported. */
  resize?: (width: number, height: number) => void
  /** Blocks (or resolves) once all submitted rendering work has completed. Used by benchmarks. */
  finish?: () => void | Promise<void>
  /**
   * Marks a frame boundary between benchmark frames. WebGL needs this: without
   * it, consecutive fullscreen draws land in one render pass and tile-based
   * GPUs (Apple) eliminate all but the last draw via hidden-surface removal.
   */
  frameBoundary?: () => void
}

/**
 * Speed at which the z slice advances for 3D variants, per second. Effects are
 * driven by elapsed seconds, and this converts that to slice depth.
 */
export const Z_SPEED = 0.25

/** What every renderer in this example needs: a noisetoy effect and a canvas size. */
export type RenderOptions = {
  effect: Effect
  /** Render width in pixels. */
  width: number
  /** Render height in pixels. Equals `width` for every non-Three.js renderer. */
  height: number
  /** Only the Three.js renderer honours the 3D modes. */
  view?: ViewMode
  /**
   * Scales the 3D views' displacement height, 0-1. Band mode passes ~0.25:
   * an isolated band is a full-height wall, and a vertex grid crenellates
   * sampling it at full displacement — scaling the relief down to a stepped
   * cliff's height makes it resolvable, while colors keep the full mask.
   */
  displacementScale?: number
}
