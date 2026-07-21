# noisetoy

Noise functions implemented with parity in **TypeScript**, **GLSL** (WebGL2), **WGSL** (WebGPU), and **Three.js TSL** — published as individual, tree-shakeable functions. You import exactly the variant and backend you ship, and nothing else rides along:

```ts
import { worley3dFastWgsl } from 'noisetoy' // ~6 KB minified, nothing but Worley
```

This repository is a monorepo:

- **`library/`** — the `noisetoy` package: the noise functions themselves, one export per variant per backend, plus small helpers for composing shader specs.
- **`example/`** — the explorer app (Next.js): the layer compositor (blending, fBm, effects), the noise registry and metadata, the implementation inventory, the cost model, the Three.js bindings, and benchmarks across all four backends. Everything opinionated lives here, not in the package.

```bash
bun install
bun run dev     # explorer app
bun run all     # format:check + lint + typecheck + warden + test
```

## Quick start

Every export follows one naming grammar:

```
<noise><2d|3d><Qualifier>[Tileable][Glsl|Wgsl|Tsl]
```

- **Qualifier** names the implementation: `Canonical` is the reference implementation of the noise; `Fast` is a cheaper alternative implementation where one exists. The two are different draws of the same statistics — swapping changes the concrete pattern, not the look. Unqualified aliases will land once a winner is picked per noise.
- **No backend suffix** = the CPU sampler. `Glsl` / `Wgsl` / `Tsl` = a composable `ShaderSpec` for that language.
- **`Tileable`** = the seamlessly wrapping code path, where the noise has one.

```ts
import { perlin3dCanonical, worley3dFast } from 'noisetoy'

perlin3dCanonical(x, y, z) // display-mapped, nominally [0, 1], unclamped
worley3dFast(x, y, z) // the faster Worley implementation

// 2D variants and tileable paths use natural arities:
import { perlin2dCanonical, perlin2dCanonicalTileable } from 'noisetoy'
perlin2dCanonical(x, y)
perlin2dCanonicalTileable(x, y, periodX, periodY) // wraps every periodX/periodY cells
```

### Shaders

A shader export is a `ShaderSpec`: `{ dim, deps, expr }` — the dependency chunks it needs (self-contained, shared hash library included) and a display expression over `p` (and `per` when tileable). `composeGlsl` / `composeWgsl` / `composeTsl` concatenate any number of specs with shared chunks deduplicated, and `glslNoiseFn` / `wgslNoiseFn` / `tslNoiseFn` wrap a spec's expression as a named function:

```ts
import { composeWgsl, wgslNoiseFn, worley3dFastWgsl, perlin3dCanonicalWgsl } from 'noisetoy'

const shader = /* wgsl */ `
${composeWgsl(worley3dFastWgsl, perlin3dCanonicalWgsl)}
${wgslNoiseFn('worleyF', worley3dFastWgsl)}
${wgslNoiseFn('perlin', perlin3dCanonicalWgsl)}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let v = worleyF(pos.xyz / 64.0) * perlin(pos.xyz / 32.0);
  return vec4f(v, v, v, 1.0);
}
`
```

The TSL specs are JavaScript source over the `three/tsl` namespace. Evaluate them with `TSL_IMPORTS` in scope:

```ts
import { composeTsl, tslNoiseFn, TSL_IMPORTS, worley3dCanonicalTsl } from 'noisetoy'
import * as TSL from 'three/tsl'

const src = `${composeTsl(worley3dCanonicalTsl)}\n${tslNoiseFn('worley', worley3dCanonicalTsl)}\nreturn worley`
const worley = new Function('TSL', `const { ${TSL_IMPORTS.join(', ')} } = TSL\n${src}`)(TSL)
material.colorNode = worley(TSL.positionLocal.mul(8)) // -> float node
```

The package never imports `three` itself — the TSL exports are strings.

One field, four languages: the CPU sampler and the shader specs of a variant read the same integer-hash lattice, so a CPU-baked texture matches what the GPU draws (f64 vs f32 rounding aside).

### Values and clamping

Samplers and shader expressions return the **display mapping** of the raw field — nominally `[0, 1]`, centered at 0.5 for signed noises, **unclamped** so the rare extremes survive if you want to fold octaves yourself. Clamp at display (`clamp01` is exported).

### Tiling

`...Tileable` exports wrap seamlessly every `periodX` / `periodY` lattice cells (kept as separate code paths so the core algorithms stay branch-free). For lattice-wrapping noises the tileable field is bit-identical to the core away from the seam; Simplex and Simplex Value tile via a 4D torus instead, which is exactly periodic but a different pattern than the core. Simplex 3D, Simplex Loop, and Simplex Value 3D have no tileable path. The `Fast` Perlin tileable is special: its period is baked at 8 cells.

## Noises

| Noise              | Variants | Tileable | Notes                                                                                   |
| ------------------ | -------- | -------- | --------------------------------------------------------------------------------------- |
| Value              | 2D, 3D   | yes      | Lattice values, quintic interpolation                                                   |
| White              | 2D, 3D   | yes      | One hashed value per cell, uninterpolated; flat spectrum. Grain at the explorer's 256   |
| Perlin             | 2D, 3D   | yes      | Gradient noise, quintic fade, Perlin's 12 cube-edge gradients                           |
| Flow               | 3D       | yes      | Perlin & Neyret (2001): gradients rotate with z, so the field churns rather than slides |
| Simplex            | 2D, 3D   | 2D only  | Simplex-grid gradient noise, 12 cube-edge gradients; 2D tiles via the 4D torus trick    |
| Simplex Loop       | 3D       | no       | 4D simplex with z on a circle — the one noise whose animation loops seamlessly          |
| Worley             | 2D, 3D   | yes      | Cellular, F1 Euclidean distance                                                         |
| Worley (Manhattan) | 2D, 3D   | yes      | Same feature points under L1: diamond distance contours                                 |
| Worley (Chebyshev) | 2D, 3D   | yes      | Same feature points under Linf: axis-aligned square contours (L1 turned 45°)            |
| Gabor              | 2D, 3D   | yes      | Lagae et al. (2009) sparse Gabor convolution; band-limited by construction              |

#### Time rather than depth

Flow and Simplex Loop are the two noises whose third input is a **phase, not a third spatial axis**, and both return exactly to their starting state every 1 unit. They are therefore the only ones whose animation can be looped rather than cut. Flow gets there by rotating each lattice gradient at its own integer rate — which is a deliberate departure from Perlin & Neyret, who rotate every gradient by one shared angle precisely to keep the gradients decorrelated; see the Flow entry in the implementation inventory. Their pseudo-advection is not implemented either, as it needs state a self-contained basis function does not have. Simplex Loop gets there by walking a circle through 4D — the same torus trick the tileable simplex path uses for space. Flow still tiles in space; Simplex Loop cannot, since both spare dimensions are already spent on the time circle.

#### Band-limiting

Gabor is the only basis here whose spectrum is a parameter rather than a consequence: the Gaussian envelope width and the harmonic frequency set the bandwidth and centre frequency directly, which is what allows Gabor noise to be filtered analytically. Wave (below) reaches a superficially similar oriented-interference look far more cheaply, but its spectrum is whatever the lattice gives it. Gabor is also the most expensive noise in the repo by a wide margin. Note that this implements the paper's kernel and spectral parameterisation, but not its sampling strategy (one impulse per cell here, against a Poisson-distributed 25–100 per kernel in the paper) nor its analytic filtering.

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

## Canonical and Fast

A noise is an idea; an implementation is one way of computing it. Two implementations of the same noise can differ severalfold in cost while producing an equivalent-looking field, so this repo tracks them separately, keeps the losers around to be re-measured, and — now that every function is an independent export — ships the challengers too, at zero cost to anyone who does not import them.

- **`Canonical`** exports are the reference implementations: the ones whose relationship to the published algorithms is documented and tested.
- **`Fast`** exports are alternative implementations that measured faster on at least one backend (details per noise in the inventory): the split-bit pruned Worley family (~2–3.4× on CPU, up to 2× on GPU), the Fibonacci-hash Perlin and Value, the shared-phase Flow (~2.1× CPU), the gated split-bit Gabor (~2.7–3.4× CPU, 1.4–1.6× GPU), and others. A Fast field has the same display statistics as its Canonical counterpart (tested) but is a **different draw** — switching changes the pattern.

The naming qualifier is coarser than the inventory's own classification (`canonical` / `alternative` / `conventional` / `novel`, each paired with the evidence backing the claim). The full inventory — what each implementation follows, every deviation, and why — lives in `example/lib/implementations.ts` and is surfaced in the explorer's noise picker.

**The one decision that spans the whole repo** is `gradDot2`/`gradDot3` in `noises/common.ts`, which builds gradients with trigonometry. Wave, Vortex and Gabor inherit it, and no reference algorithm does it that way — they index small tables of `{-1,0,1}` vectors. The case for it is real: continuous unit gradients were Perlin's _original_ 1985 design, and Gustavson & McEwan's peer-reviewed psrdnoise (JCGT 2022) chooses the same hashed-angle construction deliberately, arguing hardware `sin`/`cos` now beat table indexing on modern GPUs. Perlin and Simplex instead use the cube-edge gradient set and a folded lattice hash; measured against the published reference implementations, both are a dead heat (Perlin 1.007×, Simplex 0.99×) — neither is an improvement on the published algorithm, and what they have over the references is the absence of a 256-cell period and the ability to run in GLSL, WGSL and TSL.

### Tree-shaking is the contract

The package is built as one ES module per source module with `"sideEffects": false` — no bundling, no registry, no string-id lookups. A bundle test builds real consumers and asserts the guarantees: importing one variant's WGSL spec ships only that variant's WGSL chain (no other noises, no other languages); importing a CPU sampler ships no shader text at all; Canonical and Fast never drag each other in. A single-noise WGSL consumer lands around 6 KB minified, against ~212 KB for any consumer under the old registry design.

## Composition

The package deliberately ships **no compositor** — no layers, no blending, no fBm operator. Those are opinions about how to use noise, and they live in the example app (`example/lib/effect.ts` and `example/lib/render/*`): a declarative layer stack (`createEffect`) that folds octaves, blends Photoshop-style, posterizes, band-passes, tiles, and emits the same stack as a CPU sampler, a GLSL fragment shader, a WGSL module, or a TSL module, plus Three.js node-material bindings (`example/lib/three.ts`). If you need that machinery, it is MIT — copy it.

## The explorer app

The `example/` app renders any layer stack with four interchangeable backends — JS (CPU), WebGL, WebGPU, and Three.js (`WebGPURenderer` with TSL node materials; WebGPU only, no WebGL fallback).

- **Layers sidebar**: add layers through a picker modal (noise list + live preview + style/octaves/scale), reorder, set blend/opacity, and edit any layer's noise by clicking its name.
- **Overlay** (top right of the canvas): backend, view (2D / 3D plane / 3D sphere — the 3D views displace geometry by the effect and orbit with the mouse), and 1×/4× tiling.
- **Export**: Copy GLSL / WGSL / TSL for the whole stack, plus layer JSON import/export.
- **`/bench`**: in-browser benchmarks for every variant across the four backends (Msamples/s), sortable, with per-column relative coloring. `bun run bench` runs the CPU benchmark in the terminal.

## Architecture

- `library/src/noises/*.ts` — core TS implementations; `*.glsl.ts` / `*.wgsl.ts` / `*.tsl.ts` hold the line-for-line counterparts as template strings, plus each variant's qualified spec exports. TSL sources are JavaScript using the `three/tsl` API.
- `library/src/noises/common.*` — shared primitives (integer hash, fade, gradients) used by every lattice noise, so all four languages produce the same patterns from the same integer math.
- `library/src/noises/tileable/*` — **separate code paths** for tileability, intentionally kept out of the core implementations. Two strategies:
  - _Lattice wrapping_: lattice coordinates are wrapped `mod` period in x/y before hashing. Away from the wrap seam a tileable variant is bit-identical to its core counterpart (covered by tests).
  - _4D torus trick_ (simplex and simplex value, 2D only): the tile domain is mapped onto a torus in 4D (x and y each become a circle, radius = period / 2π so feature size is preserved) and 4D noise is sampled there. Exactly periodic, but a different pattern than the core 2D noise.
- `library/src/alt/*` — the Fast implementations (same file layout as `noises/`), plus the CPU benchmark harness (`bun run bench:impl` from `library/`).
- `library/src/spec.ts` — `ShaderSpec` / `NoiseSource` types, the compose helpers, and `TSL_IMPORTS`.
- `example/lib/registry.ts` — the explorer's noise registry: metadata, descriptions, licenses, per-variant `NoiseSource`s assembled from the package exports.
- `example/lib/effect.ts`, `example/lib/render/*` — the layer compositor and per-language composers.
- `example/lib/implementations.ts` — the implementation inventory; `example/lib/cost.ts` — the calibrated cost model.

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
