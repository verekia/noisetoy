// In-browser GPU benchmarks. Renders to an offscreen canvas and syncs with
// the GPU (readPixels for WebGL, onSubmittedWorkDone for WebGPU) so the timed
// interval covers actual GPU work, not just command submission.

import { createThreeRenderer } from '#/lib/render/three'
import { createWebglRenderer } from '#/lib/render/webgl'
import { createWebgpuRenderer } from '#/lib/render/webgpu'
import { createEffect } from 'noisetoy'

import type { BenchResult } from '#/lib/bench'
import type { Renderer, RenderOptions } from '#/lib/render/types'
import type { EffectSpec, NoiseVariant } from 'noisetoy'

const timeRenderer = async (renderer: Renderer, frames: number): Promise<number> => {
  renderer.render(0)
  await renderer.finish?.()
  const t0 = performance.now()
  for (let f = 0; f < frames; f++) {
    renderer.render(f / 60)
    renderer.frameBoundary?.()
  }
  await renderer.finish?.()
  return performance.now() - t0
}

type Create = (canvas: HTMLCanvasElement, options: RenderOptions) => Renderer | Promise<Renderer>

/**
 * Times a whole effect, so stacks and octave counts can be measured, not just
 * single variants. This is what the cost model in the library is calibrated
 * against.
 */
export const benchEffect = async (
  create: Create,
  spec: EffectSpec,
  size: number,
  frames: number,
): Promise<BenchResult> => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const effect = createEffect(spec)
  const renderer = await create(canvas, { effect, width: size, height: size })
  try {
    const ms = await timeRenderer(renderer, frames)
    const samples = size * size * frames
    return { msPerFrame: ms / frames, msamplesPerSec: samples / ms / 1000 }
  } finally {
    renderer.dispose()
  }
}

const benchGpu = (
  create: Create,
  variant: NoiseVariant,
  noiseId: string,
  size: number,
  frames: number,
): Promise<BenchResult> => benchEffect(create, { layers: [{ noise: noiseId, variant: variant.id }] }, size, frames)

export const benchWebglEffect = (spec: EffectSpec, size: number, frames: number): Promise<BenchResult> =>
  benchEffect(createWebglRenderer, spec, size, frames)

export const benchWebgpuEffect = (spec: EffectSpec, size: number, frames: number): Promise<BenchResult> =>
  benchEffect(createWebgpuRenderer, spec, size, frames)

export const benchThreeEffect = (spec: EffectSpec, size: number, frames: number): Promise<BenchResult> =>
  benchEffect(createThreeRenderer, spec, size, frames)

export const benchWebglVariant = (
  variant: NoiseVariant,
  noiseId: string,
  size: number,
  frames: number,
): Promise<BenchResult> => benchGpu(createWebglRenderer, variant, noiseId, size, frames)

export const benchWebgpuVariant = (
  variant: NoiseVariant,
  noiseId: string,
  size: number,
  frames: number,
): Promise<BenchResult> => benchGpu(createWebgpuRenderer, variant, noiseId, size, frames)

export const benchThreeVariant = (
  variant: NoiseVariant,
  noiseId: string,
  size: number,
  frames: number,
): Promise<BenchResult> => benchGpu(createThreeRenderer, variant, noiseId, size, frames)
