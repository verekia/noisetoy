// Head-to-head benchmark of a shipping implementation against the one it
// replaced.
//
// Only Simplex has a predecessor left to measure against. The reference
// implementations of Perlin and Simplex were removed from the repo: both were
// built on Perlin's 256-entry permutation table, and while it reached here
// through Gustavson's public-domain file, he could only dedicate what he owned
// and he took the table from Perlin. The parity results they produced —
// Perlin 1.007x, Simplex 0.99x against their references — are recorded in
// implementations.ts rather than re-runnable. Run with `bun run bench:impl` from the library, or
// `bun run --filter noisetoy bench:impl` from the root.
//
// This exists so a claimed speedup can be re-checked rather than believed. It
// imports the archived implementation directly from src/alt, which is why that
// source is kept after being superseded — see implementations.ts.
//
// CPU only. The GPU comparison needs the /bench page in the explorer, and the
// two do not always agree: transcendentals are far cheaper relative to integer
// work on a GPU than they are in JS, which is precisely the axis these two
// Perlins differ on. Treat this as a strong hint, not a settled answer.

import { simplex2 as simplexTable2, simplex3 as simplexTable3 } from '../noises/simplex'
import { simplex2 as simplexTrig2, simplex3 as simplexTrig3 } from './simplex-trig'

type Fn3 = (x: number, y: number, z: number) => number

const SAMPLES = 8_000_000
const WARMUP = 250_000

/** Walks a plane the way the sampler does, so cache behaviour resembles real use. */
const run = (fn: Fn3, n: number): number => {
  let acc = 0
  for (let i = 0; i < n; i++) {
    const u = (i & 1023) * 0.0117
    const v = (i >> 10) * 0.0117
    acc += fn(u, v, u * 0.37)
  }
  if (!Number.isFinite(acc)) throw new Error('benchmark produced a non-finite value')
  return acc
}

const time = (fn: Fn3): number => {
  run(fn, WARMUP)
  const t0 = Bun.nanoseconds()
  run(fn, SAMPLES)
  return (Bun.nanoseconds() - t0) / 1e6
}

const compare = (label: string, before: Fn3, after: Fn3) => {
  // Interleaved repeats: a single ordering lets JIT warmth or thermal drift
  // land entirely on one contestant.
  const beforeMs: number[] = []
  const afterMs: number[] = []
  for (let rep = 0; rep < 3; rep++) {
    beforeMs.push(time(before))
    afterMs.push(time(after))
  }
  const b = Math.min(...beforeMs)
  const a = Math.min(...afterMs)
  const rate = (ms: number) => (SAMPLES / ms) * 1e-3
  console.log(`\n${label}`)
  console.log(
    `  superseded (trig gradients)  ${b.toFixed(1).padStart(8)} ms   ${rate(b).toFixed(1).padStart(6)} Msamples/s`,
  )
  console.log(
    `  shipping   (table gradients) ${a.toFixed(1).padStart(8)} ms   ${rate(a).toFixed(1).padStart(6)} Msamples/s`,
  )
  console.log(`  speedup ${(b / a).toFixed(2)}x   (best of 3, interleaved)`)
}

console.log(`Implementation comparison — ${SAMPLES.toLocaleString()} samples per run, bun ${Bun.version}`)
compare(
  'Simplex 2D',
  (x, y) => simplexTrig2(x, y),
  (x, y) => simplexTable2(x, y),
)
compare('Simplex 3D', simplexTrig3, simplexTable3)
