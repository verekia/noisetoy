// CLI benchmark for the TS implementations: bun run bench
// (GPU backends can only be benchmarked in the browser: /bench page.)
//
// Covers every implementation in the inventory: the shipping registry
// variants plus the non-shipping AltVariants (candidates, superseded), which
// bench through the same hardened kernel (duration warmup, calibrated
// batches, median of 5 — see lib/bench.ts). Pass a noise id to bench a
// single algorithm across all of its implementations: bun run bench perlin

import { benchJsVariant } from '#/lib/bench'
import { getNoise, NOISES } from 'noisetoy'
import { ALT_VARIANTS } from 'noisetoy/implementations'

const SIZE = 512

const only = process.argv[2]
if (only && !getNoise(only)) {
  console.error(`Unknown noise '${only}'. Available: ${NOISES.map(n => n.id).join(', ')}`)
  process.exit(1)
}
const noises = only ? NOISES.filter(n => n.id === only) : NOISES

console.log(`JS (TS) noise benchmark — ${SIZE}x${SIZE}, median of 5 calibrated batches, bun ${Bun.version}\n`)
console.log(`${'variant'.padEnd(30)} ${'ms/frame'.padStart(10)} ${'Msamples/s'.padStart(12)} ${'spread'.padStart(8)}`)
console.log('-'.repeat(63))

const row = (label: string, sample: (x: number, y: number, z: number) => number, scale: number) => {
  const { msPerFrame, msamplesPerSec, spread } = benchJsVariant({ sample }, scale, SIZE)
  console.log(
    `${label.padEnd(30)} ${msPerFrame.toFixed(2).padStart(10)} ${msamplesPerSec.toFixed(1).padStart(12)} ${`${(spread * 100).toFixed(0)}%`.padStart(8)}`,
  )
}

for (const noise of noises) {
  for (const variant of noise.variants) {
    row(variant.id, variant.sample, noise.scale)
    for (const alt of ALT_VARIANTS.filter(a => a.variantId === variant.id)) {
      row(alt.id, alt.sample, noise.scale)
    }
  }
}
