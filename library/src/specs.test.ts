// Every function a composed shader calls must be defined in that shader.
//
// Shader specs declare their dependency chunks by hand, and getting that list
// wrong produces source that is perfectly valid TypeScript and fails only
// when a GPU driver tries to compile it — in one backend, sometimes only when
// tiling is enabled. This walks the composed output of every spec in all
// three languages and checks that nothing is called that is not defined or
// built in; the TSL specs are additionally evaluated against three/tsl, since
// TSL builds its node graph lazily and a bad expr can survive the text walk.

import { describe, expect, test } from 'bun:test'
import * as TSL from 'three/tsl'

import { composeGlsl, composeTsl, composeWgsl, glslNoiseFn, TSL_IMPORTS, tslNoiseFn, wgslNoiseFn } from './spec.js'
import { ALL_VARIANTS } from './testing/all-variants.js'

import type { ShaderSpec } from './spec.js'

/** Names the language provides. Anything else has to come from a chunk. */
const SHARED_BUILTINS = new Set([
  'abs',
  'clamp',
  'cos',
  'dot',
  'exp',
  'floor',
  'fract',
  'length',
  'max',
  'min',
  'mix',
  'mod',
  'normalize',
  'pow',
  'sign',
  'sin',
  'smoothstep',
  'sqrt',
  'step',
  'atan',
  'tan',
  'log',
  'log2',
  'exp2',
  'inversesqrt',
  'cross',
  'distance',
  'round',
  'trunc',
  'ceil',
  'main',
  'if',
  'for',
  'while',
  'return',
  'switch',
])

const GLSL_BUILTINS = new Set([
  ...SHARED_BUILTINS,
  'float',
  'int',
  'uint',
  'bool',
  'vec2',
  'vec3',
  'vec4',
  'ivec2',
  'ivec3',
  'mat2',
  'mat3',
  'mat4',
  'atan2',
  'texture',
  'gl_FragCoord',
])

const WGSL_BUILTINS = new Set([
  ...SHARED_BUILTINS,
  'f32',
  'i32',
  'u32',
  'bool',
  'vec2f',
  'vec3f',
  'vec4f',
  'vec2',
  'vec3',
  'vec4',
  'mat2x2f',
  'mat3x3f',
  'mat4x4f',
  'mat3x3',
  'bitcast',
  'select',
  'array',
  'atan2',
  'fma',
  'saturate',
])

const TSL_BUILTINS = new Set([
  ...SHARED_BUILTINS,
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
  'Object',
  'Math',
  'Number',
])

/**
 * Identifiers used in call position. Excludes method calls (`.mul(`), which are
 * a property of the receiver rather than a free function, and WGSL attributes
 * (`@binding(0)`), which are not calls at all.
 */
const calledNames = (src: string): Set<string> => {
  const out = new Set<string>()
  for (const m of src.matchAll(/(^|[^.\w@])([A-Za-z_]\w*)\s*\(/g)) out.add(m[2] as string)
  return out
}

const glslDefined = (src: string): Set<string> => {
  const out = new Set<string>()
  for (const m of src.matchAll(/^\s*(?:float|int|uint|bool|vec[234]|void)\s+([A-Za-z_]\w*)\s*\(/gm)) {
    out.add(m[1] as string)
  }
  return out
}
const wgslDefined = (src: string): Set<string> => {
  const out = new Set<string>()
  for (const m of src.matchAll(/\bfn\s+([A-Za-z_]\w*)\s*\(/g)) out.add(m[1] as string)
  return out
}
const tslDefined = (src: string): Set<string> => {
  const out = new Set<string>()
  for (const m of src.matchAll(/^\s*const\s+([A-Za-z_]\w*)\s*=/gm)) out.add(m[1] as string)
  return out
}

const undefinedCalls = (src: string, defined: Set<string>, builtins: Set<string>): string[] =>
  [...calledNames(src)].filter(n => !defined.has(n) && !builtins.has(n)).sort()

const evaluateTsl = (spec: ShaderSpec): unknown => {
  const src = `${composeTsl(spec)}\n${tslNoiseFn('specMain', spec)}\nreturn specMain`
  const preamble = `const { ${TSL_IMPORTS.join(', ')} } = TSL\n`
  const factory = new Function('TSL', `"use strict"\n${preamble}${src}`) as (
    tsl: typeof TSL,
  ) => (p: unknown, per?: unknown) => unknown
  const fn = factory(TSL)
  const p = spec.dim === 3 ? TSL.vec3(0.3, 0.7, 0.5) : TSL.vec2(0.3, 0.7)
  return /\bper\b/.test(spec.expr) ? fn(p, TSL.vec2(8, 8)) : fn(p)
}

test('every TSL import exists in three/tsl', () => {
  for (const name of TSL_IMPORTS) {
    expect((TSL as Record<string, unknown>)[name]).toBeDefined()
  }
})

const cases = ALL_VARIANTS.flatMap(e => {
  const s = e.source
  const out: [string, ShaderSpec, ShaderSpec, ShaderSpec][] = []
  if (s.glsl && s.wgsl && s.tsl) out.push([e.id, s.glsl, s.wgsl, s.tsl])
  if (s.glslTileable && s.wgslTileable && s.tslTileable) {
    out.push([`${e.id} (tileable)`, s.glslTileable, s.wgslTileable, s.tslTileable])
  }
  return out
})

describe.each(cases)('%s', (_label, glsl, wgsl, tsl) => {
  test('GLSL calls nothing it does not define', () => {
    const src = `${composeGlsl(glsl)}\n${glslNoiseFn('specMain', glsl)}`
    expect(undefinedCalls(src, glslDefined(src), GLSL_BUILTINS)).toEqual([])
  })

  test('WGSL calls nothing it does not define', () => {
    const src = `${composeWgsl(wgsl)}\n${wgslNoiseFn('specMain', wgsl)}`
    expect(undefinedCalls(src, wgslDefined(src), WGSL_BUILTINS)).toEqual([])
  })

  test('TSL calls nothing it does not define, and builds a node graph', () => {
    const src = `${composeTsl(tsl)}\n${tslNoiseFn('specMain', tsl)}`
    expect(undefinedCalls(src, tslDefined(src), TSL_BUILTINS)).toEqual([])
    expect(evaluateTsl(tsl)).toBeDefined()
  })
})

describe('compose helpers', () => {
  const perlin = ALL_VARIANTS.find(e => e.id === 'perlin3dCanonical')?.source
  const marble = ALL_VARIANTS.find(e => e.id === 'marble3dCanonical')?.source
  const worleyT = ALL_VARIANTS.find(e => e.id === 'worley2dCanonical')?.source
  if (!perlin?.wgsl || !marble?.wgsl || !worleyT?.wgslTileable) throw new Error('expected specs missing')

  test('shared chunks are included exactly once', () => {
    // Marble depends on the Perlin chunk; composing both must not duplicate it,
    // nor the common hash library both specs carry.
    const src = composeWgsl(perlin.wgsl as ShaderSpec, marble.wgsl as ShaderSpec)
    expect(src.split('fn perlin3(p: vec3f)').length - 1).toBe(1)
    expect(src.split('fn lowbias32(').length - 1).toBe(1)
  })

  test('chunk order follows first use, dependencies first', () => {
    const src = composeGlsl(perlin.glsl as ShaderSpec)
    // The common hash library precedes the Perlin chunk that calls into it.
    expect(src.indexOf('lowbias32')).toBeGreaterThanOrEqual(0)
    expect(src.indexOf('lowbias32')).toBeLessThan(src.indexOf('float perlin3(vec3 p)'))
  })

  test('noise wrappers pick the per signature for tileable specs', () => {
    expect(glslNoiseFn('n', perlin.glsl as ShaderSpec)).toContain('float n(vec3 p) {')
    expect(wgslNoiseFn('n', worleyT.wgslTileable as ShaderSpec)).toContain('fn n(p: vec2f, per: vec2f) -> f32 {')
  })
})
