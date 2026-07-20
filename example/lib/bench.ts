// Pure-TS benchmark kernel, shared by the CLI benchmark (bun) and the
// in-browser JS benchmark. Times sampling of a size x size grid.

import type { NoiseVariant } from 'noisetoy'

export type BenchResult = {
  /** Average milliseconds per size x size frame. */
  msPerFrame: number
  /** Million samples per second. */
  msamplesPerSec: number
}

export const benchJsVariant = (variant: NoiseVariant, scale: number, size: number, frames: number): BenchResult => {
  const sample = variant.sample
  let sink = 0

  const run = (n: number, sz: number) => {
    for (let f = 0; f < n; f++) {
      const z = f * 0.1
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          sink += sample(((x + 0.5) / sz) * scale, ((y + 0.5) / sz) * scale, z)
        }
      }
    }
  }

  run(1, Math.max(64, size >> 2)) // warmup / JIT
  const t0 = performance.now()
  run(frames, size)
  const ms = performance.now() - t0
  if (!Number.isFinite(sink)) throw new Error('benchmark sink overflow')
  const samples = size * size * frames
  return { msPerFrame: ms / frames, msamplesPerSec: samples / ms / 1000 }
}
