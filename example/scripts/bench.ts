// CLI benchmark for the TS implementations: bun run bench
// (GPU backends can only be benchmarked in the browser: /bench page.)

import { benchJsVariant } from '#/lib/bench'
import { NOISES } from 'noisetoy'

const SIZE = 512
const FRAMES = 5

console.log(`JS (TS) noise benchmark — ${SIZE}x${SIZE}, ${FRAMES} frames per variant, bun ${Bun.version}\n`)
console.log(`${'variant'.padEnd(14)} ${'ms/frame'.padStart(10)} ${'Msamples/s'.padStart(12)}`)
console.log('-'.repeat(38))

for (const noise of NOISES) {
  for (const variant of noise.variants) {
    const { msPerFrame, msamplesPerSec } = benchJsVariant(variant, noise.scale, SIZE, FRAMES)
    console.log(
      `${variant.id.padEnd(14)} ${msPerFrame.toFixed(2).padStart(10)} ${msamplesPerSec.toFixed(1).padStart(12)}`,
    )
  }
}
