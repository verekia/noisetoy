import type { Effect, Renderer, ViewMode } from 'noisetoy'

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

export type { Renderer }
