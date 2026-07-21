// The shapes shared by every per-noise export, and the helpers that compose
// shader specs into source.
//
// Each noise variant is published as independently importable pieces so a
// consumer's bundler ships only what they touch:
//
//   perlin3dCanonical          CPU sampler (display-mapped, pre-clamp)
//   perlin3dCanonicalGlsl      GLSL ShaderSpec
//   perlin3dCanonicalWgsl      WGSL ShaderSpec
//   perlin3dCanonicalTsl       TSL ShaderSpec
//   perlin3dCanonicalTileable* the tileable counterparts, where they exist
//
// The qualifier word after the dimension names the implementation: 'Canonical'
// is the reference implementation of the noise; 'Fast' is a cheaper
// alternative implementation of the same noise, where one exists. The two are
// different draws of the same statistics — swapping one for the other changes
// the concrete pattern, not the look.

/** CPU sampler of a 2D variant. Display-mapped to nominally [0, 1], unclamped. */
export type Sample2Fn = (x: number, y: number) => number

/** CPU sampler of a 3D variant. Display-mapped to nominally [0, 1], unclamped. */
export type Sample3Fn = (x: number, y: number, z: number) => number

/** Tileable CPU sampler of a 2D variant; wraps every periodX / periodY cells. */
export type SampleTileable2Fn = (x: number, y: number, periodX: number, periodY: number) => number

/** Tileable CPU sampler of a 3D variant; wraps x/y every periodX / periodY cells. */
export type SampleTileable3Fn = (x: number, y: number, z: number, periodX: number, periodY: number) => number

/**
 * Composable shader source: the dependency chunks the display expression
 * needs (self-contained — the shared hash library is included and composing
 * helpers deduplicate it), plus the pre-clamp display expression over `p`
 * (and `per` for tileable specs) — nominally [0, 1], unclamped so the fractal
 * operator can fold it; consumers clamp at display. Kept as pieces rather
 * than a composed program so multi-noise builds can share chunks.
 */
export type ShaderSpec = {
  dim: 2 | 3
  /** Dependency chunks in definition order, common library first. */
  deps: string[]
  /** Display expression over `p` (`vecN`), and `per` (`vec2`) when tileable. */
  expr: string
}

/**
 * The per-backend pieces of one noise variant, assembled by the consumer from
 * this package's exports — a layer of `createEffect` carries one of these.
 * Every field is optional: provide only the backends you render, and only
 * those ride along in your bundle. A backend whose field is missing throws
 * when (and only when) that backend is actually used.
 */
export type NoiseSource =
  | {
      dim: 2
      sample?: Sample2Fn
      sampleTileable?: SampleTileable2Fn
      glsl?: ShaderSpec
      glslTileable?: ShaderSpec
      wgsl?: ShaderSpec
      wgslTileable?: ShaderSpec
      tsl?: ShaderSpec
      tslTileable?: ShaderSpec
    }
  | {
      dim: 3
      sample?: Sample3Fn
      sampleTileable?: SampleTileable3Fn
      glsl?: ShaderSpec
      glslTileable?: ShaderSpec
      wgsl?: ShaderSpec
      wgslTileable?: ShaderSpec
      tsl?: ShaderSpec
      tslTileable?: ShaderSpec
    }

/** Dependency chunks of the given specs, deduplicated, in first-seen order. */
const dedupedChunks = (specs: ShaderSpec[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const spec of specs) {
    for (const dep of spec.deps) {
      if (!seen.has(dep)) {
        seen.add(dep)
        out.push(dep)
      }
    }
  }
  return out
}

/**
 * The GLSL chunk library needed by the given specs, shared chunks included
 * once — every function each spec's `expr` calls, in definition order.
 * Combine with `glslNoiseFn` to wrap each expr as a named function.
 */
export const composeGlsl = (...specs: ShaderSpec[]): string => dedupedChunks(specs).join('\n')

/** WGSL counterpart of `composeGlsl`. */
export const composeWgsl = (...specs: ShaderSpec[]): string => dedupedChunks(specs).join('\n')

/** TSL counterpart of `composeGlsl` (chunks are three/tsl JavaScript source). */
export const composeTsl = (...specs: ShaderSpec[]): string => dedupedChunks(specs).join('\n')

/** True when a spec's expression takes the tiling period (`per`) parameter. */
const isTileableExpr = (expr: string): boolean => /\bper\b/.test(expr)

/**
 * Wraps a spec's display expression as a named GLSL function over its chunk
 * library: `float <name>(vecN p)` — plus `vec2 per` for tileable specs.
 */
export const glslNoiseFn = (name: string, spec: ShaderSpec): string =>
  isTileableExpr(spec.expr)
    ? `float ${name}(vec${spec.dim} p, vec2 per) { return ${spec.expr}; }`
    : `float ${name}(vec${spec.dim} p) { return ${spec.expr}; }`

/** WGSL counterpart of `glslNoiseFn`: `fn <name>(p: vecNf) -> f32`. */
export const wgslNoiseFn = (name: string, spec: ShaderSpec): string =>
  isTileableExpr(spec.expr)
    ? `fn ${name}(p: vec${spec.dim}f, per: vec2f) -> f32 { return ${spec.expr}; }`
    : `fn ${name}(p: vec${spec.dim}f) -> f32 { return ${spec.expr}; }`

/** TSL counterpart of `glslNoiseFn`: `const <name> = Fn(...)`. */
export const tslNoiseFn = (name: string, spec: ShaderSpec): string =>
  isTileableExpr(spec.expr)
    ? `const ${name} = Fn(([p, per]) => ${spec.expr})`
    : `const ${name} = Fn(([p]) => ${spec.expr})`

/**
 * Identifiers the TSL chunks expect from the three/tsl namespace. Evaluate a
 * composed TSL source with these in scope:
 *
 * ```ts
 * const src = `${composeTsl(worley3dCanonicalTsl)}\n${tslNoiseFn('worley', worley3dCanonicalTsl)}\nreturn worley`
 * const worley = new Function('TSL', `const { ${TSL_IMPORTS.join(', ')} } = TSL\n${src}`)(await import('three/tsl'))
 * ```
 */
export const TSL_IMPORTS = [
  'Fn',
  'If',
  'Loop',
  'select',
  'float',
  'int',
  'uint',
  'vec2',
  'vec3',
  'vec4',
  'mat3',
  'mix',
  'dot',
  'length',
  'floor',
  'fract',
  'abs',
  'min',
  'max',
  'clamp',
  'sqrt',
  'smoothstep',
  'cos',
  'sin',
  'exp',
  'atan',
  'mod',
] as const
