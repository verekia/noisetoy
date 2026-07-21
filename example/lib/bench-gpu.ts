// In-browser GPU benchmarks. Renders to an offscreen canvas and syncs with
// the GPU (readPixels for WebGL, onSubmittedWorkDone for WebGPU) so the timed
// interval covers actual GPU work, not just command submission.
//
// Hardened the same way as the JS kernel in bench.ts, because GPU one-shots
// are even less trustworthy than CPU ones — a cold GPU downclocks
// aggressively, and a fixed 100-frame burst mostly measures what clock state
// the chip was in when the burst started:
//
//   1. WARM UP by rendering the real workload for a fixed duration, in small
//      synced chunks (never an unbounded submit queue), so shader compilation
//      and clock ramping happen before the clock starts.
//   2. CALIBRATE frames per batch against a target batch duration with a
//      short synced probe.
//   3. REPEAT five fully synced batches, report the median batch throughput
//      and carry the spread so unstable cells are visible.

import { BENCH_BATCH_MS, BENCH_BATCHES, BENCH_WARMUP_MS, BENCH_Z_CYCLE, summarizeBatches } from '#/lib/bench'
import { createEffect } from '#/lib/effect'
import { createThreeRenderer } from '#/lib/render/three'
import { createWebglRenderer } from '#/lib/render/webgl'
import { createWebgpuRenderer } from '#/lib/render/webgpu'

import type { BenchResult } from '#/lib/bench'
import type { EffectSpec } from '#/lib/effect'
import type { AltVariant } from '#/lib/implementations'
import type { NoiseVariant } from '#/lib/registry'
import type { Renderer, RenderOptions } from '#/lib/render/types'

/** Frames per synced warmup/probe chunk — keeps the submit queue bounded. */
const CHUNK = 8
/** Ceiling on calibrated batch size, in case a probe reads absurdly fast. */
const MAX_FRAMES_PER_BATCH = 2000

/** Render a fully synced chunk of frames; returns its wall-clock ms. */
const syncedChunk = async (renderer: Renderer, frames: number): Promise<number> => {
  const t0 = performance.now()
  for (let i = 0; i < frames; i++) {
    renderer.render((i % BENCH_Z_CYCLE) / 60)
    renderer.frameBoundary?.()
  }
  await renderer.finish?.()
  return performance.now() - t0
}

const timeRenderer = async (renderer: Renderer, samplesPerFrame: number): Promise<BenchResult> => {
  // First frame alone: pipeline/shader compilation, not part of any budget.
  renderer.render(0)
  await renderer.finish?.()
  // Clock ramp: keep the GPU busy for the warmup duration in synced chunks.
  const warmupEnd = performance.now() + BENCH_WARMUP_MS
  do {
    await syncedChunk(renderer, CHUNK)
  } while (performance.now() < warmupEnd)
  // Calibrate frames per batch from a synced probe.
  const probeMs = await syncedChunk(renderer, CHUNK)
  const estimate = Math.max(0.02, probeMs / CHUNK)
  const framesPerBatch = Math.min(MAX_FRAMES_PER_BATCH, Math.max(CHUNK, Math.ceil(BENCH_BATCH_MS / estimate)))
  const batchMs: number[] = []
  for (let b = 0; b < BENCH_BATCHES; b++) {
    batchMs.push(await syncedChunk(renderer, framesPerBatch))
  }
  return summarizeBatches(batchMs, framesPerBatch, samplesPerFrame)
}

type Create = (canvas: HTMLCanvasElement, options: RenderOptions) => Renderer | Promise<Renderer>

/**
 * Times a whole effect, so stacks and octave counts can be measured, not just
 * single variants. This is what the cost model in the library is calibrated
 * against.
 */
export const benchEffect = async (create: Create, spec: EffectSpec, size: number): Promise<BenchResult> => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const effect = createEffect(spec)
  const renderer = await create(canvas, { effect, width: size, height: size })
  try {
    return await timeRenderer(renderer, size * size)
  } finally {
    renderer.dispose()
  }
}

const benchGpu = (create: Create, variant: NoiseVariant, scale: number, size: number): Promise<BenchResult> =>
  benchEffect(create, { layers: [{ noise: variant.source, scale }] }, size)

/**
 * Times a non-shipping implementation through its AltVariant's NoiseSource —
 * the same layer the viewer renders it with.
 */
const benchGpuAlt = (create: Create, alt: AltVariant, scale: number, size: number): Promise<BenchResult> =>
  benchEffect(create, { layers: [{ noise: alt.source, scale }] }, size)

export const benchWebglAlt = (alt: AltVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpuAlt(createWebglRenderer, alt, scale, size)

export const benchWebgpuAlt = (alt: AltVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpuAlt(createWebgpuRenderer, alt, scale, size)

export const benchThreeAlt = (alt: AltVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpuAlt(createThreeRenderer, alt, scale, size)

export const benchWebglEffect = (spec: EffectSpec, size: number): Promise<BenchResult> =>
  benchEffect(createWebglRenderer, spec, size)

export const benchWebgpuEffect = (spec: EffectSpec, size: number): Promise<BenchResult> =>
  benchEffect(createWebgpuRenderer, spec, size)

export const benchThreeEffect = (spec: EffectSpec, size: number): Promise<BenchResult> =>
  benchEffect(createThreeRenderer, spec, size)

export const benchWebglVariant = (variant: NoiseVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpu(createWebglRenderer, variant, scale, size)

export const benchWebgpuVariant = (variant: NoiseVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpu(createWebgpuRenderer, variant, scale, size)

export const benchThreeVariant = (variant: NoiseVariant, scale: number, size: number): Promise<BenchResult> =>
  benchGpu(createThreeRenderer, variant, scale, size)
