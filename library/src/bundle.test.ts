// What a consumer actually ships.
//
// The rule this file enforces: importing a noise from `noisetoy` must never
// pull in the implementation inventory, nor any alternative implementation it
// documents. Those exist to be benchmarked against, not to be shipped. The only
// thing stopping a stray `import { IMPLEMENTATIONS } from './implementations'`
// in the core is this test, so it bundles for real and looks.
//
// Note it bundles a synthetic CONSUMER rather than the entry point itself.
// Bundling src/index.ts directly is worthless: it is nothing but re-exports, so
// the bundler tree-shakes it to about 700 bytes and every assertion below would
// pass vacuously — as this test did, until that was caught. The consumer has to
// actually call the API for the bundle to contain anything.
//
// WHAT THIS CATCHES, precisely. It fails when core code takes a RUNTIME
// dependency on the inventory — registry.ts importing IMPLEMENTATIONS and
// hanging it off each NoiseDef, say, which is the version of this mistake that
// is easy to make and expensive to ship. Verified by doing exactly that and
// watching it fail.
//
// It deliberately does NOT fail on a bare `export { IMPLEMENTATIONS } from
// './implementations'` added to index.ts, because that is harmless: no consumer
// imports it, so it tree-shakes away (helped by "sideEffects": false in
// package.json). Re-exporting is a taste question; depending on it is a bug.

import { afterAll, expect, test } from 'bun:test'

const DIR = `${import.meta.dir}/../.bundle-test`
const ENTRY = `${import.meta.dir}/index.ts`
const IMPLS = `${import.meta.dir}/implementations.ts`

const bundleConsumer = async (name: string, source: string): Promise<string> => {
  const path = `${DIR}/${name}.js`
  await Bun.write(path, source)
  const built = await Bun.build({ entrypoints: [path], minify: true, target: 'browser' })
  if (!built.success) throw new Error(built.logs.map(String).join('\n'))
  const out = built.outputs[0]
  if (!out) throw new Error(`no output for ${name}`)
  return out.text()
}

afterAll(async () => {
  await Bun.$`rm -rf ${DIR}`.quiet().nothrow()
})

/**
 * Strings that appear only in the inventory. Deliberately drawn from its data,
 * not from identifiers: a bundler can rename `IMPLEMENTATIONS`, but it cannot
 * rewrite the contents of a string literal it decided to keep.
 *
 * Chosen carefully. 'Gustavson' looks like an obvious marker and is useless —
 * it legitimately appears in the registry's `license` fields, so it reports a
 * leak on a clean tree. Anything from IMPLEMENTATION_KIND_LABEL is useless too:
 * it is a separate const, so it tree-shakes away even in a consumer that does
 * use the inventory. These four are prose or ids that exist nowhere else.
 */
const INVENTORY_MARKERS = ['psrdnoise', 'spaceship hulls', 'one-point-per-cell', 'kernel-weighted-values']

/** A consumer doing the most ordinary thing: one noise, sampled and compiled. */
const TYPICAL_CONSUMER = `
  import { createEffect } from ${JSON.stringify(ENTRY)}
  const e = createEffect({ layers: [{ noise: 'perlin', octaves: 5 }] })
  globalThis.out = [e.sample(0.5, 0.5), e.glsl().length, e.wgsl().length]
`

// Sanity check on the markers themselves. If this ever fails, the markers have
// drifted out of the inventory prose and every guard below is passing vacuously.
test('the inventory markers really are in the inventory', async () => {
  const code = await bundleConsumer(
    'uses-inventory',
    `
      import { IMPLEMENTATIONS } from ${JSON.stringify(IMPLS)}
      globalThis.out = Object.keys(IMPLEMENTATIONS).length + JSON.stringify(IMPLEMENTATIONS).length
    `,
  )
  for (const marker of INVENTORY_MARKERS) expect(code).toContain(marker)
})

test('a typical consumer does not ship the implementation inventory', async () => {
  const code = await bundleConsumer('typical', TYPICAL_CONSUMER)
  expect(INVENTORY_MARKERS.filter(m => code.includes(m))).toEqual([])
})

test('a consumer pulling the whole registry still does not ship the inventory', async () => {
  const code = await bundleConsumer(
    'whole-registry',
    `
      import { NOISES, createEffect } from ${JSON.stringify(ENTRY)}
      globalThis.out = NOISES.map(n => createEffect({ layers: [{ noise: n.id }] }).glsl().length)
    `,
  )
  expect(INVENTORY_MARKERS.filter(m => code.includes(m))).toEqual([])
})

/**
 * Modules reachable from an entry point by following relative imports. A static
 * walk rather than a bundler question: what matters is whether the graph can
 * touch src/alt at all, not whether a minifier happened to drop it this time.
 */
const reachableFrom = async (entry: string): Promise<string[]> => {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    let src: string
    try {
      src = await Bun.file(file).text()
    } catch {
      continue
    }
    const dir = file.slice(0, file.lastIndexOf('/'))
    for (const m of src.matchAll(/from\s+'(\.[^']*)'/g)) {
      const parts = `${dir}/${m[1] as string}`.split('/')
      const resolved: string[] = []
      for (const part of parts) {
        if (part === '.' || part === '') continue
        if (part === '..') resolved.pop()
        else resolved.push(part)
      }
      queue.push(`/${resolved.join('/')}.ts`)
    }
  }
  return [...seen]
}

// Archived implementations are the whole reason src/alt exists. They must be
// reachable from the benchmark and from nothing a consumer imports.
test('no archived implementation is reachable from the default entry', async () => {
  const reached = await reachableFrom(`${import.meta.dir}/index.ts`)
  expect(reached.filter(f => f.includes('/src/alt/'))).toEqual([])
})

test('no archived implementation is reachable from the three.js entry', async () => {
  const reached = await reachableFrom(`${import.meta.dir}/three.ts`)
  expect(reached.filter(f => f.includes('/src/alt/'))).toEqual([])
})

// Guards the guard: if the walk silently resolved nothing, the two tests above
// would pass on an empty set and mean nothing.
test('the reachability walk actually traverses the graph', async () => {
  const reached = await reachableFrom(`${import.meta.dir}/index.ts`)
  expect(reached.length).toBeGreaterThan(40)
  expect(reached.some(f => f.endsWith('/noises/perlin.ts'))).toBe(true)
  // ...and it does reach src/alt from the benchmark, which is where it belongs.
  const fromBench = await reachableFrom(`${import.meta.dir}/alt/bench.ts`)
  expect(fromBench.some(f => f.includes('/src/alt/simplex-trig.ts'))).toBe(true)
})

// Not a correctness property, but a number worth keeping in front of us while
// implementations get added: the core resolves noises by string id out of one
// NOISES array, so nothing in it tree-shakes and a consumer using a single
// noise still pays for all variants across all four languages. This ceiling is
// here to catch an inventory (or a set of alternatives) silently landing in the
// core. It is not an endorsement of the current size.
test('a single-noise consumer stays under its size ceiling', async () => {
  const kb = (await bundleConsumer('typical-size', TYPICAL_CONSUMER)).length / 1024
  expect(kb).toBeGreaterThan(50) // guards the guard: a vacuous ~0KB bundle fails here
  expect(kb).toBeLessThan(260)
})
