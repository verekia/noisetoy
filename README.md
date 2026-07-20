# noisetoy

Noise functions implemented with parity in **TypeScript**, **GLSL** (WebGL2), **WGSL** (WebGPU), and **Three.js TSL**, plus a layer compositor that emits any of them from a single description.

This repository is a monorepo:

- **`library/`** — the `noisetoy` package: noises, composition/blending, and Three.js bindings under `noisetoy/three`.
- **`example/`** — the explorer app (Next.js) used to compare visual results and performance across backends.

```bash
bun install
bun run dev     # explorer app
bun run all     # format:check + lint + typecheck + warden + test
```

## Quick start

```ts
import { createEffect } from 'noisetoy'

const effect = createEffect({
  layers: [
    { noise: 'perlin', octaves: 5 },
    { noise: 'worley', style: 'ridged', blend: 'multiply', opacity: 0.6, scale: 2 },
  ],
})

effect.sample(0.5, 0.5, 0) // CPU value in [0, 1]
effect.glsl() // GLSL ES 3.00 fragment shader
effect.wgsl() // WGSL module (vs/fs entry points)
effect.tsl() // Three.js TSL module
```

One description, four languages, one domain: `sample(u, v, z)` and the shaders read the same field, so a CPU-baked texture matches what the GPU draws.

### Layers

Layers apply bottom to top with a blend mode and opacity, Photoshop-style. Every per-noise setting is per layer.

| Field             | Default           | Notes                                                                                       |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `noise`           | —                 | Noise id, e.g. `'perlin'` (see `NOISES`)                                                    |
| `variant` / `dim` | 3D when available | `variant: 'perlin-2d'` or `dim: 2`                                                          |
| `octaves`         | `1`               | 1–10, lacunarity 2                                                                          |
| `gain`            | `0.5`             | 0.1–0.9 per-octave amplitude falloff; raise it to keep fine octaves visible                 |
| `style`           | `'basic'`         | `'basic'` (fBm), `'billow'`, `'ridged'`                                                     |
| `scale`           | `1`               | Multiplies the noise's base lattice scale                                                   |
| `blend`           | `'normal'`        | `normal`, `add`, `multiply`, `screen`, `overlay`, `difference`, `darken`, `lighten`, `warp` |
| `opacity`         | `1`               | Mixes the blended result with the layers below                                              |

`warp` is the noise-native blend: instead of pixel math, the accumulated result beneath the layer displaces that layer's sampling coordinates, which produces structure neither noise contains on its own.

### Tiling

Set `tiled: true` to sample through the separate tileable code paths (kept out of the core algorithms), which repeats one tile in a `TILE_REPEAT`-square grid. It only takes effect when every layer's variant is tileable — check `effect.tileable`.

### Sampling domain

`domain: 'uv'` (the default) walks a 2D plane. `domain: 'position'` samples the stack in 3D space instead, which is seamless on closed surfaces — no uv wrap seam and no pole pinching on a sphere. Use `effect.sampleAt(x, y, z, time)` on the CPU, or pass a `position` node to `effectNode`. Tiling does not apply to the solid domain.

### Three.js

```ts
import { createEffect } from 'noisetoy'
import { effectNode, effectNormalNode } from 'noisetoy/three'
import { positionLocal, uniform, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

const effect = createEffect({ layers: [{ noise: 'perlin', octaves: 6 }] })
const z = uniform(0) // animate 3D variants

const material = new MeshBasicNodeMaterial()
material.colorNode = vec3(effectNode(effect, { z }))

// Displace a plane and shade it with the matching surface normal:
material.positionNode = positionLocal.add(vec3(0, 0, effectNode(effect, { z }).mul(0.32)))
const normal = effectNormalNode(effect, { z })
```

`noisetoy/three` requires a `WebGPURenderer`; `three` is an optional peer dependency, so the core entry never imports it.

## Noises

| Noise              | Variants | Tileable | Notes                                                                                   |
| ------------------ | -------- | -------- | --------------------------------------------------------------------------------------- |
| Value              | 2D, 3D   | yes      | Lattice values, quintic interpolation                                                   |
| White              | 2D, 3D   | yes      | One hashed value per cell, uninterpolated; flat spectrum. Grain at the default 256      |
| Perlin             | 2D, 3D   | yes      | Gradient noise, quintic fade, Perlin's 12 cube-edge gradients                           |
| Flow               | 3D       | yes      | Perlin & Neyret (2001): gradients rotate with z, so the field churns rather than slides |
| Simplex            | 2D, 3D   | 2D only  | Simplex-grid gradient noise, 12 cube-edge gradients; 2D tiles via the 4D torus trick    |
| Simplex Loop       | 3D       | no       | 4D simplex with z on a circle — the one noise whose animation loops seamlessly          |
| Worley             | 2D, 3D   | yes      | Cellular, F1 Euclidean distance                                                         |
| Worley (Manhattan) | 2D, 3D   | yes      | Same feature points under L1: diamond distance contours                                 |
| Worley (Chebyshev) | 2D, 3D   | yes      | Same feature points under Linf: axis-aligned square contours (L1 turned 45°)            |
| Gabor              | 2D, 3D   | yes      | Lagae et al. (2009) sparse Gabor convolution; band-limited by construction              |

#### Time rather than depth

Flow and Simplex Loop are the two noises whose third input is a **phase, not a third spatial axis**, and both return exactly to their starting state every 1 unit — four seconds at the default z speed. They are therefore the only ones whose animation can be looped rather than cut. Flow gets there by rotating each lattice gradient at its own integer rate — which is a deliberate departure from Perlin & Neyret, who rotate every gradient by one shared angle precisely to keep the gradients decorrelated; see the Flow entry in the implementation inventory. Their pseudo-advection is not implemented either, as it needs state a self-contained basis function does not have. Simplex Loop gets there by walking a circle through 4D — the same torus trick the tileable simplex path uses for space. Flow still tiles in space; Simplex Loop cannot, since both spare dimensions are already spent on the time circle.

#### Band-limiting

Gabor is the only basis here whose spectrum is a parameter rather than a consequence: the Gaussian envelope width and the harmonic frequency set the bandwidth and centre frequency directly, which is what allows Gabor noise to be filtered analytically. Wave (below) reaches a superficially similar oriented-interference look far more cheaply, but its spectrum is whatever the lattice gives it. Gabor is also the most expensive noise in the repo by a wide margin — roughly 9 hashes per cell against Worley's 3, plus an `exp` and a `cos`. Note that this implements the paper's kernel and spectral parameterisation, but not its sampling strategy (one impulse per cell here, against a Poisson-distributed 25–100 per kernel in the paper) nor its analytic filtering.

### Experiments and derived noises

Noises created for this repo (MIT). Every entry below is an original implementation; the **Provenance** column discloses which existing (and potentially patented) ideas each one builds on. None reuse third-party code.

| Noise         | Variants | Tileable   | Goal  | Idea                                                                                             | Provenance / inspiration                                                                                                             |
| ------------- | -------- | ---------- | ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Simplex Value | 2D, 3D   | 2D (torus) | speed | Hashed _values_ on the simplex lattice, kernel-weighted: 3/4 hashes, no gradients, no trig.      | Simplex lattice skew + kernel from Ken Perlin's simplex (US patent 6,867,776, **expired 2022**), per Gustavson                       |
| Wave          | 2D, 3D   | yes (wrap) | looks | Hashed plane wave (direction + phase) per lattice corner, quintic-blended. Fingerprint look.     | Lattice/fade from classic Perlin (unpatented); concept related to Gabor (Lagae 2009) / phasor (Tricard 2019) noise, no known patents |
| Ripple        | 2D, 3D   | yes (wrap) | looks | Radial waves from Worley-style feature points, windowed and summed. Water-drop caustics.         | Worley 1996 point set; sparse convolution after J.P. Lewis (1984/89); no known patents                                               |
| Marble        | 2D, 3D   | yes (wrap) | looks | cos(x + turbulence), 3 octaves of \|Perlin\| bending bands into veins.                           | Ken Perlin, "An Image Synthesizer" (1985); classic formula, unpatented                                                               |
| Contour       | 2D, 3D   | yes (wrap) | looks | cos(12 · Perlin) iso-line bands; topographic contours.                                           | "Sine of noise" shader folklore; no known patent                                                                                     |
| Mosaic        | 2D, 3D   | yes (wrap) | looks | Flat shading by nearest feature point's hash (Voronoi id). Stained glass.                        | Worley 1996 + widespread folklore variant; no known patent                                                                           |
| Crackle       | 2D, 3D   | yes (wrap) | looks | F2 − F1 distance difference; dark cracks along cell walls.                                       | Variant suggested in Worley's own 1996 paper; no known patent                                                                        |
| Foam          | 2D, 3D   | yes (wrap) | looks | Original: max of spherical domes √(R²−d²) over feature points. Soap-bubble caps.                 | Worley point set; related to metaball/sparse-convolution folklore                                                                    |
| Stars         | 2D, 3D   | yes (wrap) | looks | Original: sum of Gaussian splats exp(−18d²) with hashed brightness. Drifting starfield.          | Worley point set; Gaussian splatting folklore                                                                                        |
| Vortex        | 2D, 3D   | yes (wrap) | looks | Original: angle of quintic-blended hashed unit vectors shown as cos(2θ); swirls + singularities. | Lattice/fade from classic Perlin (unpatented); angle-field display appears original                                                  |
| Truchet       | 2D       | yes (wrap) | looks | Ring bands along random Truchet arc tiles; meandering connected pipes.                           | Truchet tiles (S. Truchet 1704, C.S. Smith 1987), public domain; arc-distance shading is shader folklore                             |

Patent note: the only patent known to touch any algorithm in this repo is Ken Perlin's US 6,867,776 (simplex noise in 3D+), which expired in January 2022; it is relevant to Simplex, Simplex Value, Simplex Loop, and the 4D-torus tileable paths. All other listed bases (Perlin classic/improved noise, flow noise, Worley cellular noise and its distance-metric variants, Gabor noise, phasor-style waves, Truchet tilings) have, to our knowledge, no patents; this is a good-faith disclosure, not legal advice.

Findings (Apple Silicon, this repo's benchmarks): Simplex Value 3D is ~3× faster than Perlin 3D and ~2.3× faster than Simplex 3D on the CPU, and ~1.8× faster than either on WebGL — avoiding per-corner trig and halving the hash count is what pays. Plain value noise is still the raw CPU champion (branch-free lerp chain), but it interpolates in a hypercube, while Simplex Value is the cheapest _simplex-lattice_ (isotropy-friendlier) noise here. Wave and Ripple sit at Worley-like GPU cost and are the most visually distinctive.

Ten variants — White, Flow, Simplex Loop, the two Worley metrics and Gabor — have **not** been through the GPU benchmark yet. Their cost-model entries are listed in `PENDING_GPU_CALIBRATION` and were derived from hand-counted instructions plus a timing transferred from a benchmarked variant of the same code shape; treat their ordering against the measured noises as provisional. Gabor 3D is the one to re-measure first: the op count puts it at ~1.9× Ripple 3D, while the CPU benchmark makes it ~4.7×, and the two backends charge very differently for `exp` and `cos`.

## Implementations

A noise is an idea; an implementation is one way of computing it. Two implementations of the same noise can differ severalfold in cost while producing an equivalent-looking field, so the repo tracks them separately and keeps the losers around to be re-measured.

Every implementation is classified against the algorithm it implements:

| Kind                  | Meaning                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Canonical**         | Follows the reference formulation. Any deviations are incidental                   |
| **Known alternative** | Implements the published algorithm by a documented route that is not the reference |
| **Novel**             | No known precedent for computing it this way                                       |

Current inventory — 16 canonical variants, 11 known-alternative, 12 novel:

| Noise                                            | Kind              | Implementation               | Headline deviation from the reference                                 |
| ------------------------------------------------ | ----------------- | ---------------------------- | --------------------------------------------------------------------- |
| Value, White, Contour                            | Canonical         | the obvious one              | —                                                                     |
| Marble, Mosaic, Crackle, Truchet                 | Canonical         | published formula            | retuned constants only                                                |
| Simplex Loop                                     | Canonical         | 4D simplex on a time circle  | reference 32-vector 4D gradient set                                   |
| Perlin                                           | Canonical         | Table gradients, folded hash | folded lattice hash instead of a permutation table                    |
| **Simplex**                                      | Known alternative | Table gradients, folded hash | a 3D kernel radius belonging to neither published lineage             |
| **Worley** (+ both metrics)                      | Known alternative | One point per cell           | the paper draws a variable Poisson count per cube                     |
| **Gabor**                                        | Known alternative | One impulse per cell         | 1–2 orders of magnitude sparser than the paper; no analytic filtering |
| **Flow**                                         | Known alternative | Per-corner rotation rates    | both references rotate every gradient by one shared angle             |
| Simplex Value, Wave, Ripple, Foam, Stars, Vortex | Novel             | —                            | noises invented here                                                  |

The full per-implementation detail — what each one follows, every deviation, and why — lives in `library/src/implementations.ts` and is surfaced in the explorer's noise picker.

**The one decision that spans the whole repo** is `gradDot2`/`gradDot3` in `noises/common.ts`, which builds gradients with trigonometry. Wave, Vortex and Gabor inherit it, and no reference algorithm does it that way — they index small tables of `{-1,0,1}` vectors. The case for it is real: continuous unit gradients were Perlin's _original_ 1985 design, and Gustavson & McEwan's peer-reviewed psrdnoise (JCGT 2022) chooses the same hashed-angle construction deliberately, arguing hardware `sin`/`cos` now beat table indexing on modern GPUs.

**Perlin and Simplex instead use** the cube-edge gradient set and a folded lattice hash.

**Measured against the published reference implementations, both are a dead heat** — Perlin 1.007x, Simplex 0.99x. Neither is an improvement on the published algorithm and neither should be described as one. What they have over the references is the absence of a 256-cell period, and the ability to run in GLSL, WGSL and TSL, where a 512-entry lookup table cannot.

Those two figures are recorded rather than re-runnable, because the reference baselines are not kept in the repo: both need Perlin's 256-entry permutation table, and although Gustavson's public-domain file carries that table, he could only dedicate what he owned — the table is Perlin's. The risk is slight — 256 integers, reproduced everywhere for two decades, never asserted — but it is the one provenance question that cannot be closed by argument, so the table is simply not here. GPU performance is unmeasured throughout.

Caveat worth keeping in view: psrdnoise's argument was about _GPUs_, where trigonometry is far cheaper relative to integer work, and the op-count model predicts smaller wins there (~2.6x for Perlin). That comparison has not been run. Wave, Vortex and Gabor still use the trigonometric gradients and are the remaining candidates.

### Consumers never ship the inventory

`noisetoy` exports only the current fastest implementation of each noise. The inventory and (in time) the alternative implementations live behind `noisetoy/implementations`, which the core entry never imports — enforced by a bundle test that fails if core code takes a runtime dependency on it.

When a faster implementation is found it is promoted into `src/noises/**`, the previous champion moves to `src/alt/**`, and both stay listed in the inventory with the loser marked `superseded`.

> **Known issue, unrelated to implementations.** The core entry is not tree-shakeable today: `createEffect` resolves noises by string id out of one `NOISES` array, so a consumer using a single noise on the CPU still bundles all 39 variants across all four shader languages — about 212 KB minified. Splitting implementations out does not fix that; making the registry per-noise and lazily composed would. The bundle test pins the current size so it cannot quietly get worse.

## The explorer app

The `example/` app renders any layer stack with four interchangeable backends — JS (CPU), WebGL, WebGPU, and Three.js (`WebGPURenderer` with TSL node materials; WebGPU only, no WebGL fallback).

- **Layers sidebar**: add layers through a picker modal (noise list + live preview + style/octaves/scale), reorder, set blend/opacity, and edit any layer's noise by clicking its name.
- **Overlay** (top right of the canvas): backend, view (2D / 3D plane / 3D sphere — the 3D views displace geometry by the effect and orbit with the mouse), and 1×/4× tiling.
- **Export**: Copy GLSL / WGSL / TSL for the whole stack, plus layer JSON import/export.
- **`/bench`**: in-browser benchmarks for every variant across the four backends (Msamples/s), sortable, with per-column relative coloring. `bun run bench` runs the CPU benchmark in the terminal.

## Architecture

- `library/src/noises/*.ts` — core TS implementations; `*.glsl.ts` / `*.wgsl.ts` / `*.tsl.ts` hold the line-for-line counterparts as template strings. TSL sources are JavaScript using the `three/tsl` API: the same text is evaluated at runtime by `noisetoy/three` and exported verbatim by `effect.tsl()`.
- `library/src/noises/common.*` — shared primitives (integer hash, fade, gradients) used by every lattice noise, so all four languages produce the same patterns from the same integer math.
- `library/src/noises/tileable/*` — **separate code paths** for tileability, intentionally kept out of the core implementations. Two strategies:
  - _Lattice wrapping_: lattice coordinates are wrapped `mod` period in x/y before hashing. Away from the wrap seam a tileable variant is bit-identical to its core counterpart (covered by tests).
  - _4D torus trick_ (simplex and simplex value, 2D only): the tile domain is mapped onto a torus in 4D (x and y each become a circle, radius = period / 2π so feature size is preserved) and 4D noise is sampled there. Exactly periodic, but a different pattern than the core 2D noise.
- `library/src/registry.ts` — the noise registry: metadata, CPU samplers, and composable shader specs per variant.
- `library/src/render/{glsl,wgsl,tsl,sampler}.ts` — the composers. Each turns a layer stack into one program in its language, deduplicating shader chunks shared between layers.
- `library/src/effect.ts` — the public `createEffect` API.
- `library/src/three.ts` — `noisetoy/three`: TSL nodes for node materials.

Cross-language parity notes: all lattice randomness derives from the same u32 hash (`lowbias32`), evaluated with exact integer semantics in every language (`Math.imul`/`>>>` in TS, `uint` in GLSL, `u32` in WGSL/TSL). Float math differs between f64 (JS) and f32 (GPU), so outputs are visually identical but not bit-identical across backends.

## Licensing

Everything in this repository is MIT (see `LICENSE`). All implementations were written from the published algorithms, not copied from existing code:

- **Hash**: `lowbias32` by Chris Wellons, explicitly public domain ([nullprogram.com](https://nullprogram.com/blog/2018/07/31/)).
- **Perlin / Improved Noise**: algorithm by Ken Perlin (2002), including its 12 cube-edge gradient vectors. Perlin's own `ImprovedNoise.java` is **not** freely licensed — it asserts copyright and grants nothing — so no code is taken from it. The gradient selection is derived from the geometry of that vector set, and the permutation table is replaced by a folded lattice hash.
- **Simplex** (2D, 3D, 4D): algorithm by Ken Perlin (2001), skew/unskew formulation and 4D rank-based corner ordering per Stefan Gustavson's "Simplex noise demystified" / reference Java implementation (public domain). US patent 6,867,776 covering 3D+ simplex expired in January 2022.
- **Worley / cellular**: algorithm from Steven Worley, "A Cellular Texture Basis Function" (SIGGRAPH 1996), simplified to one feature point per cell (the paper uses a variable Poisson-distributed count). The Manhattan variant uses a metric the paper discusses by name; Chebyshev is **not** in the paper — substituting it is later shader folklore.
- **Flow**: technique from Ken Perlin and Fabrice Neyret, "Flow Noise" (SIGGRAPH 2001 technical sketch) — gradients rotated over time. Written from the description; the paper's pseudo-advection half is not implemented.
- **Gabor**: algorithm from Ares Lagae, Sylvain Lefebvre, George Drettakis and Philip Dutré, "Procedural Noise using Sparse Gabor Convolution" (SIGGRAPH 2009). Written from the paper; impulses are placed one per lattice cell rather than by a Poisson process, and no precomputation or analytic filtering is implemented.
- Value noise, white noise and fBm are folklore techniques with no licensing concerns.

No code was taken from GPL/other copyleft noise libraries (e.g. no Ashima/webgl-noise code is used, although that library is MIT and would be usable with attribution).
