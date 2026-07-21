// Every function a composed shader calls must be defined in that shader.
//
// Shader chunks declare their dependencies by hand in the registry, and getting
// that list wrong produces source that is perfectly valid TypeScript and fails
// only when a GPU driver tries to compile it — in one backend, sometimes only
// when tiling is enabled. Exactly that happened when Perlin's tileable path
// started calling perlinGrad2/3 from the core chunk without declaring it: the
// whole suite passed, including the TSL test that evaluates every tiled body,
// because TSL builds its node graph lazily and never touched the missing name.
//
// This walks the composed output for every variant and tiling mode in all three
// languages and checks that nothing is called that is not defined or built in.

import { describe, expect, test } from 'bun:test'

import { NOISES } from '../registry'
import { buildGlslFragment } from './glsl'
import { buildTslBody } from './tsl'
import { buildWgslShader } from './wgsl'

import type { NoiseVariant } from '../registry'
import type { LayerConfig } from './types'

const layer = (variant: NoiseVariant, scale: number): LayerConfig => ({
  noise: variant.source,
  scale,
  octaves: 2,
  rotate: false,
  style: 'basic',
  blend: 'normal',
  opacity: 1,
  speed: 0,
  angle: 0,
})

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
// Not anchored to line start: entry points carry a stage attribute first, as in
// `@fragment fn fs(...)`.
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

const cases = NOISES.flatMap(noise =>
  noise.variants.flatMap(variant =>
    (variant.sampleTileable ? [false, true] : [false]).map(
      tiled => [`${variant.id}${tiled ? ' (tiled)' : ''}`, noise, variant, tiled] as const,
    ),
  ),
)

describe.each(cases)('%s', (_label, noise, variant, tiled) => {
  const cfg = { layers: [layer(variant, noise.scale)], tiled, size: 512 }

  test('GLSL calls nothing it does not define', () => {
    const src = buildGlslFragment(cfg)
    expect(undefinedCalls(src, glslDefined(src), GLSL_BUILTINS)).toEqual([])
  })

  test('WGSL calls nothing it does not define', () => {
    const src = buildWgslShader(cfg)
    expect(undefinedCalls(src, wgslDefined(src), WGSL_BUILTINS)).toEqual([])
  })

  test('TSL calls nothing it does not define', () => {
    const src = buildTslBody(cfg)
    expect(undefinedCalls(src, tslDefined(src), TSL_BUILTINS)).toEqual([])
  })
})
