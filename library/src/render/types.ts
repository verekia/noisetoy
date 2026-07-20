import type { NoiseVariant } from '../registry'

/**
 * Per-octave shaping of the fractal operator: 'basic' sums signed octaves
 * (fBm), 'billow' folds each octave's absolute value (puffy look), 'ridged'
 * inverts the fold (mountain-ridge look).
 */
export type FractalStyle = 'basic' | 'billow' | 'ridged'

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
  variant: NoiseVariant
  /**
   * Lattice cells across one tile for this layer (noise scale x the layer's
   * scale multiplier); also its tiling period, which the caller keeps integral
   * when tiling.
   */
  scale: number
  /**
   * Fractal stacking applied on top of the noise (lacunarity 2), normalized
   * variance-preserving by sqrt(sum of squared amplitudes). This is a
   * display-level operator kept out of the core noise implementations.
   */
  octaves: number
  /**
   * Per-octave amplitude falloff. At the classic 0.5 each octave carries half
   * the previous one, so past ~5 octaves the additions fall below one 8-bit
   * level and below the pixel grid; raising it keeps the fine octaves
   * contributing.
   */
  gain: number
  style: FractalStyle
  /** Ignored for the bottom layer. */
  blend: BlendMode
  /** 0..1, mixes the blended result with the accumulator below. */
  opacity: number
  /** Translation speed in lattice cells per second. 0 disables translation. */
  speed: number
  /** Translation heading in degrees: 0 is right, 90 is up (counter-clockwise). */
  angle: number
}

/**
 * Sampling offset per second for a translating layer, in lattice cells. The
 * pattern appears to move along `angle`, so the sampling point moves the other
 * way; v points down, which flips the y component back.
 */
export const translationVelocity = (speed: number, angle: number): [number, number] => {
  if (!speed) return [0, 0]
  const rad = (angle * Math.PI) / 180
  return [-Math.cos(rad) * speed, Math.sin(rad) * speed]
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
}

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
