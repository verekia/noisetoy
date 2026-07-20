// CPU renderer: calls the effect's TypeScript sampler per pixel into an
// ImageData. Same domain as the shaders: uv = (pixel + 0.5) / size, y down.

import type { RenderOptions, Renderer } from '#/lib/render/types'

export const createJsRenderer = (canvas: HTMLCanvasElement, { effect, width: size }: RenderOptions): Renderer => {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2d context')
  const image = ctx.createImageData(size, size)
  const data = image.data
  const sample = effect.sample

  const render = (timeSec: number) => {
    let o = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const byte = (sample((x + 0.5) / size, (y + 0.5) / size, timeSec) * 255 + 0.5) | 0
        data[o] = byte
        data[o + 1] = byte
        data[o + 2] = byte
        data[o + 3] = 255
        o += 4
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  return { render, dispose: () => {} }
}
