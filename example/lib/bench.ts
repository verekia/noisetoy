// Pure-TS benchmark kernel, shared by the CLI benchmark (bun) and the
// in-browser JS benchmark, plus the batch summarization the GPU benchmarks
// reuse. Takes anything with a display `sample` so registry variants and the
// inventory's AltVariants (non-shipping implementations) bench identically.
//
// HOW THE NUMBERS ARE MADE TRUSTWORTHY. A single timed burst is at the mercy
// of whatever state the machine happens to be in — JIT tier, CPU/GPU clock
// ramp, a background tab stealing a slice. The same lessons as the library's
// bench:impl apply here:
//
//   1. WARM UP on the real workload for a fixed DURATION, not a fixed frame
//      count, so JIT tiering and clock ramping happen before the clock starts.
//   2. CALIBRATE the batch size so every timed batch covers a target duration
//      (~150 ms). A fast variant gets more frames, a slow one fewer; nothing
//      is timed over a 10 ms window where timer resolution and scheduler
//      noise dominate the measurement.
//   3. REPEAT five timed batches and report the MEDIAN batch throughput. The
//      spread across batches ships with the result, so an unstable cell is
//      visibly unstable instead of silently wrong.
//
// Every frame samples the same set of z-slices (frame index mod Z_CYCLE) so
// all batches do statistically identical work — without that, variants whose
// cost depends on position (the pruned Worley candidate) would drift between
// batches for reasons that have nothing to do with the implementation.

import type { NoiseVariant } from '#/lib/registry'

export type BenchResult = {
  /** Median milliseconds per size x size frame. */
  msPerFrame: number
  /** Median million samples per second across the timed batches. */
  msamplesPerSec: number
  /** (max - min) / median of the per-batch rates: 0.1 means a 10% spread. */
  spread: number
}

/** Timed batches per measurement; the median is what gets reported. */
export const BENCH_BATCHES = 5
/** Target duration of one timed batch, in ms. */
export const BENCH_BATCH_MS = 150
/** Warmup duration before anything is timed, in ms. Long enough to ramp CPU
 * clocks from a cold start, not just to tier the JIT — the first variant
 * benched showed a 59% batch spread at 100 ms and settles at 250 ms. */
export const BENCH_WARMUP_MS = 250

/** Frames cycle through this many z-slices so every batch does the same work. */
export const BENCH_Z_CYCLE = 32

const median = (values: number[]): number => {
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[sorted.length >> 1] as number
}

/** Fold per-batch timings into the median-based result. */
export const summarizeBatches = (batchMs: number[], framesPerBatch: number, samplesPerFrame: number): BenchResult => {
  const rates = batchMs.map(ms => (framesPerBatch * samplesPerFrame) / ms / 1000)
  const rate = median(rates)
  return {
    msPerFrame: median(batchMs) / framesPerBatch,
    msamplesPerSec: rate,
    spread: rate > 0 ? (Math.max(...rates) - Math.min(...rates)) / rate : 0,
  }
}

export const benchJsVariant = (variant: Pick<NoiseVariant, 'sample'>, scale: number, size: number): BenchResult => {
  const sample = variant.sample
  let sink = 0

  const renderFrame = (f: number) => {
    const z = (f % BENCH_Z_CYCLE) * 0.1
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        sink += sample(((x + 0.5) / size) * scale, ((y + 0.5) / size) * scale, z)
      }
    }
  }

  // Warm up on the real frame size until the budget elapses (at least once).
  const warmupEnd = performance.now() + BENCH_WARMUP_MS
  let warm = 0
  do {
    renderFrame(warm++)
  } while (performance.now() < warmupEnd)

  // Calibrate frames per batch against the target batch duration.
  const t0 = performance.now()
  renderFrame(0)
  const estimate = Math.max(0.05, performance.now() - t0)
  const framesPerBatch = Math.max(1, Math.ceil(BENCH_BATCH_MS / estimate))

  const batchMs: number[] = []
  for (let b = 0; b < BENCH_BATCHES; b++) {
    const start = performance.now()
    for (let i = 0; i < framesPerBatch; i++) renderFrame(i)
    batchMs.push(performance.now() - start)
  }
  if (!Number.isFinite(sink)) throw new Error('benchmark sink overflow')
  return summarizeBatches(batchMs, framesPerBatch, size * size)
}
