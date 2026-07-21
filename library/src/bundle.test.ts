// What a consumer actually ships.
//
// The rule this file enforces: importing one noise variant from `noisetoy`
// ships that variant and its dependency chain — nothing else. No registry, no
// other noises, no other languages' chunk text, and never the test manifest.
// The package relies on module-graph granularity ("sideEffects": false plus a
// bundle-free dist), so the guarantee is checked by bundling real consumers
// and looking at what survives.
//
// Note it bundles synthetic CONSUMERS rather than the entry point itself.
// Bundling src/index.ts directly is worthless: it is nothing but re-exports,
// so the bundler tree-shakes it to almost nothing and every assertion below
// would pass vacuously. The consumer has to actually use what it imports.

import { afterAll, expect, test } from 'bun:test'

const DIR = `${import.meta.dir}/../.bundle-test`
const ENTRY = `${import.meta.dir}/index.ts`

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

// Sanity check on the markers themselves: a consumer that uses everything
// must contain every marker the guards below assert the ABSENCE of. If this
// fails, a marker drifted out of the sources and a guard is passing vacuously.
test('the markers really exist in the full catalog', async () => {
  const code = await bundleConsumer(
    'uses-everything',
    `
      import * as lib from ${JSON.stringify(ENTRY)}
      globalThis.out = Object.values(lib)
        .map(v => (typeof v === 'function' ? v(0.3, 0.7, 0.5) : JSON.stringify(v)))
        .join('|').length
    `,
  )
  for (const marker of [
    'fn worley3', // Worley WGSL
    'float worley3', // Worley GLSL
    'fn perlin3', // Perlin WGSL
    'float perlinFast3', // fast Perlin GLSL
    'gaborFast3(p)', // fast Gabor expr
    'truchet2(p)', // Truchet expr
  ]) {
    expect(code).toContain(marker)
  }
})

test('a WGSL-only Worley consumer ships only the Worley WGSL chain', async () => {
  const code = await bundleConsumer(
    'worley-wgsl',
    `
      import { composeWgsl, wgslNoiseFn, worley3dCanonicalWgsl } from ${JSON.stringify(ENTRY)}
      globalThis.out = composeWgsl(worley3dCanonicalWgsl) + wgslNoiseFn('worley', worley3dCanonicalWgsl)
    `,
  )
  expect(code).toContain('fn worley3')
  // No other noise rides along...
  for (const other of ['perlin', 'gabor', 'simplex', 'truchet', 'vortex']) {
    expect(code.toLowerCase()).not.toContain(other)
  }
  // ...and no other language's text does either (GLSL worley defines
  // `float worley3(vec2|vec3 ...)`; WGSL never emits that shape).
  expect(code).not.toContain('float worley3')
  expect(code).not.toContain('.mul(') // TSL chunk text
  const kb = code.length / 1024
  expect(kb).toBeGreaterThan(0.5) // guards the guard: a vacuous ~0KB bundle fails here
  expect(kb).toBeLessThan(24)
})

test('a CPU-only fast Perlin consumer ships no shader text at all', async () => {
  const code = await bundleConsumer(
    'perlin-cpu',
    `
      import { perlin3dFast } from ${JSON.stringify(ENTRY)}
      globalThis.out = perlin3dFast(0.3, 0.7, 0.5)
    `,
  )
  expect(code).not.toContain('fn perlinFast') // WGSL
  expect(code).not.toContain('float perlinFast') // GLSL
  expect(code).not.toContain('vec3f') // any WGSL chunk
  for (const other of ['worley', 'gabor', 'simplex', 'truchet']) {
    expect(code.toLowerCase()).not.toContain(other)
  }
  const kb = code.length / 1024
  expect(kb).toBeGreaterThan(0.3)
  expect(kb).toBeLessThan(24)
})

test('canonical and fast are independent: importing one never ships the other', async () => {
  const code = await bundleConsumer(
    'worley-canonical-cpu',
    `
      import { worley3dCanonical } from ${JSON.stringify(ENTRY)}
      globalThis.out = worley3dCanonical(0.3, 0.7, 0.5)
    `,
  )
  // The fast implementation lives in its own modules; 'Fast' identifiers and
  // its split-bit hash text must not appear.
  expect(code).not.toContain('worleyFast')
  expect(code).not.toContain('fib1')
})

/**
 * Modules reachable from an entry point by following relative imports. A static
 * walk rather than a bundler question: what matters is whether the graph can
 * touch src/testing at all, not whether a minifier happened to drop it.
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
      // Source imports carry the emitted .js extension; the files are .ts.
      const path = `/${resolved.join('/')}`.replace(/\.js$/, '')
      queue.push(path.endsWith('.ts') ? path : `${path}.ts`)
    }
  }
  return [...seen]
}

// The test manifest imports the whole catalog at once; it exists for the test
// suite and must never be reachable from anything a consumer imports.
test('the test manifest is not reachable from the entry point', async () => {
  const reached = await reachableFrom(ENTRY)
  expect(reached.filter(f => f.includes('/src/testing/'))).toEqual([])
})

// Guards the guard: if the walk silently resolved nothing, the test above
// would pass on an empty set and mean nothing.
test('the reachability walk actually traverses the graph', async () => {
  const reached = await reachableFrom(ENTRY)
  expect(reached.length).toBeGreaterThan(80)
  expect(reached.some(f => f.endsWith('/noises/perlin.ts'))).toBe(true)
  expect(reached.some(f => f.endsWith('/alt/worley-fast.wgsl.ts'))).toBe(true)
})
