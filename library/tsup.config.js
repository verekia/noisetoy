import { defineConfig } from 'tsup'

// Two separate builds instead of one multi-entry build: when entries share
// modules (here the effect/registry types, which `three` needs for its node
// helpers), tsup's dts bundler hoists the shared types into a content-hashed
// chunk (effect-<hash>.d.ts). Building `three` on its own makes each d.ts
// self-contained — the types are duplicated structurally, which TS treats as
// identical.
export default defineConfig([
  {
    // `noisetoy` — engine-agnostic core: noises, composers, CPU sampler.
    entry: { index: 'src/index.ts' },
    clean: true,
    format: ['esm'],
    dts: true,
    splitting: false,
  },
  {
    // `noisetoy/three` — the Three.js/TSL bindings, kept out of the core bundle.
    entry: { three: 'src/three.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
    external: ['three', 'three/tsl'],
  },
  {
    // `noisetoy/implementations` — the implementation inventory and, in time,
    // the alternative implementations themselves. A separate entry so that
    // importing a noise never ships the implementations it beat; the core
    // build must not reach this module. Guarded by a test.
    entry: { implementations: 'src/implementations.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
  },
])
