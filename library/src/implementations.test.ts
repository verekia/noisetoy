import { describe, expect, test } from 'bun:test'

import {
  ALT_VARIANTS,
  allImplementations,
  altVariantsFor,
  defaultImplementationOf,
  EVIDENCE_LABEL,
  evidenceSupportsKind,
  IMPLEMENTATION_KIND_LABEL,
  IMPLEMENTATIONS,
  implementationOf,
} from './implementations'
import { getNoise, NOISES } from './registry'

// The inventory is a separate entry point and deliberately has no runtime link
// to the registry, so nothing checks that the two agree except these tests.
describe('inventory covers the registry', () => {
  test('every noise has at least one implementation', () => {
    expect(NOISES.filter(n => !IMPLEMENTATIONS[n.id]?.length).map(n => n.id)).toEqual([])
  })

  test('no inventory entry outlives its noise', () => {
    const live = new Set(NOISES.map(n => n.id))
    expect(Object.keys(IMPLEMENTATIONS).filter(id => !live.has(id))).toEqual([])
  })

  // Keying implementations to variant ids is what lets the cost model and the
  // benchmark, which are keyed the same way, partition by implementation. That
  // only holds if the mapping is a genuine partition of the variants.
  test('every variant belongs to exactly one implementation of its own noise', () => {
    for (const noise of NOISES) {
      for (const variant of noise.variants) {
        const owners = (IMPLEMENTATIONS[noise.id] ?? []).filter(i => i.variantIds.includes(variant.id))
        expect({ variant: variant.id, owners: owners.length }).toEqual({ variant: variant.id, owners: 1 })
      }
    }
  })

  test('no implementation claims a variant that does not exist on its noise', () => {
    for (const noise of NOISES) {
      const ids = new Set(noise.variants.map(v => v.id))
      for (const impl of IMPLEMENTATIONS[noise.id] ?? []) {
        expect({ impl: impl.id, dangling: impl.variantIds.filter(id => !ids.has(id)) }).toEqual({
          impl: impl.id,
          dangling: [],
        })
      }
    }
  })

  test('implementation ids are unique within a noise', () => {
    for (const [noiseId, impls] of Object.entries(IMPLEMENTATIONS)) {
      const ids = impls.map(i => i.id)
      expect({ noiseId, unique: new Set(ids).size }).toEqual({ noiseId, unique: ids.length })
    }
  })

  test('implementationOf resolves every variant', () => {
    for (const noise of NOISES) {
      for (const variant of noise.variants) {
        expect(implementationOf(variant.id)).toBeDefined()
      }
    }
  })

  // A superseded implementation is history, not code the registry serves. It
  // keeps its source so the comparison can be re-run, and says where.
  test('non-shipping implementations own no variants and record where they went', () => {
    for (const { implementation } of allImplementations().filter(i => i.implementation.status)) {
      expect({ id: implementation.id, variants: implementation.variantIds }).toEqual({
        id: implementation.id,
        variants: [],
      })
      expect(implementation.archivedAt?.length ?? 0).toBeGreaterThan(0)
    }
  })

  // What `noisetoy` exports is by definition the current champion, so every
  // noise must have exactly one implementation that is not superseded.
  test('every noise has exactly one shipping implementation', () => {
    for (const noise of NOISES) {
      const live = (IMPLEMENTATIONS[noise.id] ?? []).filter(i => !i.status)
      expect({ noise: noise.id, live: live.length }).toEqual({ noise: noise.id, live: 1 })
      expect(defaultImplementationOf(noise.id)?.id).toBe(live[0]?.id as string)
    }
  })
})

describe('inventory metadata is filled in, not stubbed', () => {
  test.each(
    allImplementations().map(
      ({ noiseId, implementation }) => [`${noiseId}/${implementation.id}`, implementation] as const,
    ),
  )('%s', (_label, impl) => {
    expect(impl.name.length).toBeGreaterThan(0)
    expect(IMPLEMENTATION_KIND_LABEL[impl.kind]).toBeDefined()
    // A canonical or alternative implementation is a claim ABOUT something
    // published, so it has to say what. Conventional and novel ones follow
    // nothing by definition — a `follows` on those is a category error, naming
    // a source that does not exist, which is how folklore got called canonical
    // in the first place.
    if (impl.kind === 'canonical' || impl.kind === 'alternative') {
      expect(impl.follows?.length ?? 0).toBeGreaterThan(0)
    } else {
      expect(impl.follows).toBeUndefined()
    }
    // An alternative is by definition a departure from the reference. With no
    // deviation recorded, either it is really canonical or the audit is
    // incomplete — both worth failing over.
    if (impl.kind === 'alternative') {
      expect(impl.deviations?.length ?? 0).toBeGreaterThan(0)
    }
  })
})

// A noise invented here cannot have a canonical or alternative implementation:
// there is no reference formulation for it to follow or depart from.
test('originals only carry novel implementations', () => {
  for (const noise of NOISES.filter(n => n.original)) {
    for (const impl of IMPLEMENTATIONS[noise.id] ?? []) {
      expect({ noise: noise.id, kind: impl.kind }).toEqual({ noise: noise.id, kind: 'novel' })
    }
  }
})

// The rule that the previous version of this inventory lacked. Ten
// implementations once claimed 'canonical' with nothing behind them; five said
// "folklore, no reference paper" in their own follows text while doing it.
describe('claims are backed by evidence', () => {
  test.each(
    allImplementations().map(
      ({ noiseId, implementation }) => [`${noiseId}/${implementation.id}`, implementation] as const,
    ),
  )('%s states evidence consistent with its claim', (_label, impl) => {
    expect(EVIDENCE_LABEL[impl.evidence]).toBeDefined()
    expect({ kind: impl.kind, evidence: impl.evidence, ok: evidenceSupportsKind(impl.kind, impl.evidence) }).toEqual({
      kind: impl.kind,
      evidence: impl.evidence,
      ok: true,
    })
  })

  // Folklore must not be dressed up as fidelity to a source that does not exist.
  test('nothing claims a relationship to a source it also calls folklore', () => {
    for (const { noiseId, implementation } of allImplementations()) {
      const saysFolklore = /folklore|no reference paper|no single reference|convention/i.test(
        implementation.follows ?? '',
      )
      if (saysFolklore) {
        expect({ noiseId, kind: implementation.kind }).toEqual({ noiseId, kind: 'conventional' })
      }
    }
  })

  // Anything above 'none' has to say where the authority actually is, or the
  // reader cannot go and check it — which is the entire failure being fixed.
  test('evidence above none cites a paper or an implementation', () => {
    for (const { noiseId, implementation } of allImplementations()) {
      if (implementation.evidence === 'none') continue
      const r = implementation.reference
      expect({
        noiseId,
        id: implementation.id,
        cites: Boolean(r?.paper || r?.implementation || r?.url),
      }).toEqual({ noiseId, id: implementation.id, cites: true })
    }
  })

  // A reference we have actually transliterated must say where it lives.
  test('measured-against-reference points at the in-repo transliteration', () => {
    for (const { implementation } of allImplementations()) {
      if (implementation.evidence !== 'measured-against-reference') continue
      expect(implementation.reference?.inRepo?.length ?? 0).toBeGreaterThan(0)
    }
  })
})

// `inRepo` points at a transliteration we keep. Deleting one and leaving the
// pointer behind turns the inventory into a map to files that are not there,
// which is exactly how this metadata rots. Caught a stale path once already.
test('every inRepo path actually exists', async () => {
  for (const { noiseId, implementation } of allImplementations()) {
    const rel = implementation.reference?.inRepo
    if (!rel) continue
    const abs = `${import.meta.dir}/../${rel}`
    expect({ noiseId, rel, exists: await Bun.file(abs).exists() }).toEqual({ noiseId, rel, exists: true })
  }
})

// Same for archivedAt, which names where a non-shipping implementation went.
test('every archivedAt path actually exists', async () => {
  for (const { noiseId, implementation } of allImplementations()) {
    const rel = implementation.archivedAt
    if (!rel) continue
    const abs = `${import.meta.dir}/../${rel}`
    expect({ noiseId, rel, exists: await Bun.file(abs).exists() }).toEqual({ noiseId, rel, exists: true })
  }
})

// A speed claim that cannot be re-run outside this repo is an anecdote. Every
// non-shipping implementation kept in src/alt must stay runnable through
// ALT_VARIANTS, one stand-in per dimension its noise ships, or the explorer's
// benchmark silently stops covering it.
describe('alt variants keep the non-shipping implementations runnable', () => {
  test('every non-shipping implementation in src/alt provides a stand-in per shipping dimension', () => {
    for (const { noiseId, implementation } of allImplementations()) {
      if (!implementation.status || !implementation.archivedAt?.startsWith('src/alt/')) continue
      const noise = getNoise(noiseId)
      for (const variant of noise?.variants ?? []) {
        const alt = altVariantsFor(noiseId, implementation.id).find(v => v.dim === variant.dim)
        expect({ noiseId, impl: implementation.id, dim: variant.dim, runnable: Boolean(alt) }).toEqual({
          noiseId,
          impl: implementation.id,
          dim: variant.dim,
          runnable: true,
        })
      }
    }
  })

  test('every alt variant points at a documented non-shipping implementation and a real registry variant', () => {
    for (const alt of ALT_VARIANTS) {
      const impl = (IMPLEMENTATIONS[alt.noiseId] ?? []).find(i => i.id === alt.implementationId)
      expect({ id: alt.id, documented: Boolean(impl?.status) }).toEqual({ id: alt.id, documented: true })
      const noise = getNoise(alt.noiseId)
      const variant = noise?.variants.find(v => v.id === alt.variantId)
      expect({ id: alt.id, mirrors: variant?.dim }).toEqual({ id: alt.id, mirrors: alt.dim })
      expect(alt.id).toBe(`${alt.variantId}@${alt.implementationId}`)
    }
  })

  test('alt samples are deterministic and clamped to [0, 1]', () => {
    for (const alt of ALT_VARIANTS) {
      for (let i = 0; i < 500; i++) {
        const x = (i % 37) * 0.61 - 9
        const y = (i % 23) * 0.43 - 5
        const z = (i % 17) * 0.29
        const v = alt.sample(x, y, z)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
        expect(alt.sample(x, y, z)).toBe(v)
      }
    }
  })
})
