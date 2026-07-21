// Head-to-head benchmark of each shipping implementation against the
// non-shipping candidates kept in src/alt: the fast-hash Perlin and Simplex
// and the pruned-search Worley that challenge it. (The trig-gradient Simplex
// this file originally existed for was removed after losing consistently on
// every backend; its 2.4x figure is recorded in implementations.ts.)
//
// The reference implementations of Perlin and Simplex were removed from the
// repo: both were built on Perlin's 256-entry permutation table, and while it
// reached here through Gustavson's public-domain file, he could only dedicate
// what he owned and he took the table from Perlin. The parity results they
// produced — Perlin 1.007x, Simplex 0.99x against their references — are
// recorded in implementations.ts rather than re-runnable. Run with
// `bun run bench:impl` from the library, or
// `bun run --filter noisetoy bench:impl` from the root.
//
// This exists so a claimed speedup can be re-checked rather than believed. It
// imports the non-shipping implementations directly from src/alt, which is why
// that source is kept — see implementations.ts.
//
// A caveat learned the hard way: the full suite times a dozen functions
// through one megamorphic call site, and the JIT's decisions under that load
// can depress individual candidates — Worley 2D once read 305 ms here against
// 236 ms in an isolated two-way run of identical code. When a single
// comparison matters, re-run it isolated before believing a regression.
//
// CPU only. The GPU comparison needs the /bench page in the explorer, and the
// two do not always agree: transcendentals are far cheaper relative to integer
// work on a GPU than they are in JS, which is precisely the axis the two
// Simplexes differ on — and the Perlin pair differ on integer avalanche
// width, which a GPU also prices differently. Treat this as a strong hint,
// not a settled answer.

import { mosaic2, mosaic3 } from '../noises/cellular'
import { flow3 } from '../noises/flow'
import { perlin2, perlin3 } from '../noises/perlin'
import { simplex2 as simplexTable2, simplex3 as simplexTable3 } from '../noises/simplex'
import { worley2, worley3 } from '../noises/worley'
import { chebyshev2, chebyshev3, manhattan2, manhattan3 } from '../noises/worley-metrics'
import { mosaicFast2, mosaicFast3 } from './cellular-fast'
import { flowFast3 } from './flow-fast'
import { perlinFast2, perlinFast3 } from './perlin-fast'
import { simplexFast2, simplexFast3 } from './simplex-fast'
import { worleyFast2, worleyFast3 } from './worley-fast'
import { chebyshevFast2, chebyshevFast3, manhattanFast2, manhattanFast3 } from './worley-metrics-fast'

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

const compare = (label: string, before: [string, Fn3], after: [string, Fn3]) => {
  // Interleaved repeats: a single ordering lets JIT warmth or thermal drift
  // land entirely on one contestant. The median is reported next to the best
  // because a single lucky run once manufactured a 4.5% "win" that a
  // dedicated 12-repeat rerun measured at exactly 1.00x — trust a speedup
  // only when both statistics agree.
  const REPS = 5
  const beforeMs: number[] = []
  const afterMs: number[] = []
  for (let rep = 0; rep < REPS; rep++) {
    beforeMs.push(time(before[1]))
    afterMs.push(time(after[1]))
  }
  beforeMs.sort((p, q) => p - q)
  afterMs.sort((p, q) => p - q)
  const b = beforeMs[0] as number
  const a = afterMs[0] as number
  const bMed = beforeMs[REPS >> 1] as number
  const aMed = afterMs[REPS >> 1] as number
  const rate = (ms: number) => (SAMPLES / ms) * 1e-3
  const row = (name: string, best: number, median: number) =>
    console.log(
      `  ${name.padEnd(29)} ${best.toFixed(1).padStart(8)} ms   ${rate(best).toFixed(1).padStart(6)} Msamples/s   (median ${median.toFixed(1)} ms)`,
    )
  console.log(`\n${label}`)
  row(before[0], b, bMed)
  row(after[0], a, aMed)
  console.log(
    `  speedup ${(b / a).toFixed(2)}x best, ${(bMed / aMed).toFixed(2)}x median   (best of ${REPS}, interleaved)`,
  )
}

console.log(`Implementation comparison — ${SAMPLES.toLocaleString()} samples per run, bun ${Bun.version}`)
compare(
  'Perlin 2D',
  ['shipping  (folded lowbias32)', (x, y) => perlin2(x, y)],
  ['candidate (Fibonacci hash)', (x, y) => perlinFast2(x, y)],
)
compare('Perlin 3D', ['shipping  (folded lowbias32)', perlin3], ['candidate (Fibonacci hash)', perlinFast3])
compare(
  'Worley 2D',
  ['shipping  (chained avalanches)', (x, y) => worley2(x, y)],
  ['candidate (split bits, pruned)', (x, y) => worleyFast2(x, y)],
)
compare('Worley 3D', ['shipping  (chained avalanches)', worley3], ['candidate (split bits, pruned)', worleyFast3])
compare('Flow 3D', ['shipping  (per-corner trig)', flow3], ['candidate (shared-phase trig)', flowFast3])
compare(
  'Manhattan 2D',
  ['shipping  (chained avalanches)', (x, y) => manhattan2(x, y)],
  ['candidate (split bits, pruned)', (x, y) => manhattanFast2(x, y)],
)
compare(
  'Manhattan 3D',
  ['shipping  (chained avalanches)', manhattan3],
  ['candidate (split bits, pruned)', manhattanFast3],
)
compare(
  'Chebyshev 2D',
  ['shipping  (chained avalanches)', (x, y) => chebyshev2(x, y)],
  ['candidate (split bits, pruned)', (x, y) => chebyshevFast2(x, y)],
)
compare(
  'Chebyshev 3D',
  ['shipping  (chained avalanches)', chebyshev3],
  ['candidate (split bits, pruned)', chebyshevFast3],
)
compare(
  'Mosaic 2D',
  ['shipping  (chained avalanches)', (x, y) => mosaic2(x, y)],
  ['candidate (split bits, pruned)', (x, y) => mosaicFast2(x, y)],
)
compare('Mosaic 3D', ['shipping  (chained avalanches)', mosaic3], ['candidate (split bits, pruned)', mosaicFast3])
compare(
  'Simplex 2D vs candidate',
  ['shipping  (folded lowbias32)', (x, y) => simplexTable2(x, y)],
  ['candidate (fast hash)', (x, y) => simplexFast2(x, y)],
)
compare(
  'Simplex 3D vs candidate',
  ['shipping  (folded lowbias32)', simplexTable3],
  ['candidate (fast hash)', simplexFast3],
)
