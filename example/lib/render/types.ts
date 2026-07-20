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
}

export type { Renderer }
