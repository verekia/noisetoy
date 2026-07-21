// Three.js TSL bindings for the explorer (formerly the noisetoy/three entry).
//
// Turns an Effect into TSL nodes for node materials on a WebGPURenderer. The
// composed TSL source (the same text `effect.tsl()` returns) is evaluated
// against the three/tsl namespace, so the nodes are exactly what the library
// documents and exports.

import * as TSL from 'three/tsl'

import { TSL_IMPORTS } from './render/tsl'
import { DISPLACEMENT } from './render/types'

import type { Effect } from './effect'

type TslNamespace = typeof TSL
type Node = ReturnType<TslNamespace['float']>
type Vec2Node = ReturnType<TslNamespace['vec2']>
type Vec3Node = ReturnType<TslNamespace['vec3']>
type EffectFn = (uv: unknown, time: unknown) => Node

const cache = new WeakMap<Effect, EffectFn>()

/**
 * Compiles (and caches) an effect into a TSL function `(uv, time) => float`.
 * `uv` is a vec2 node in [0, 1) with y pointing down; `time` is a float node
 * of elapsed seconds, driving 3D variants and layer translation.
 */
export const effectFn = (effect: Effect): EffectFn => {
  const cached = cache.get(effect)
  if (cached) return cached
  const preamble = `const { ${TSL_IMPORTS.join(', ')} } = TSL\n`
  const factory = new Function('TSL', `"use strict"\n${preamble}${effect.tslBody()}\nreturn effect`) as (
    tsl: TslNamespace,
  ) => EffectFn
  const fn = factory(TSL)
  cache.set(effect, fn)
  return fn
}

export type NodeOptions = {
  /** vec2 node in [0, 1). Defaults to the mesh uv with y flipped to match the shaders. */
  uv?: Vec2Node
  /**
   * vec3 sample position, for effects created with `domain: 'position'`.
   * Defaults to `positionGeometry` — the raw geometry attribute, which for a
   * unit sphere is the surface point. Deliberately NOT `positionLocal`: a
   * material's `positionNode` overwrites positionLocal, so in the fragment
   * stage positionLocal carries the DISPLACED position and a color node
   * sampling through it reads the field somewhere else than the geometry
   * did — the pattern visibly slides off the relief.
   */
  position?: Vec3Node
  /** Elapsed seconds as a float node, driving 3D variants and translation. Defaults to 0. */
  time?: Node
}

const defaultUv = (): Vec2Node => TSL.vec2(TSL.uv().x, TSL.uv().y.oneMinus())

/**
 * The effect value as a float node in [0, 1].
 *
 * ```ts
 * material.colorNode = vec3(effectNode(effect, { z: timeUniform }))
 * ```
 */
export const effectNode = (effect: Effect, options: NodeOptions = {}): Node => {
  const { time = TSL.float(0) as unknown as Node } = options
  if (effect.domain === 'position') {
    return effectFn(effect)(options.position ?? TSL.positionGeometry, time)
  }
  return effectFn(effect)(options.uv ?? defaultUv(), time)
}

export type DisplacementOptions = NodeOptions & {
  /** Height at effect value 1, in local units. Default `DISPLACEMENT`. */
  amount?: number
  /** Finite-difference step in uv units. Default 1/384. */
  epsilon?: number
  /** World size of one uv unit, used to scale the tangents. Default 2 (a PlaneGeometry(2, 2)). */
  planeSize?: number
}

/**
 * Local-space surface normal of the displaced field, from finite differences
 * of the same effect. Pair with `effectNode` on a plane whose +Z is up:
 *
 * ```ts
 * material.positionNode = positionLocal.add(vec3(0, 0, effectNode(effect).mul(0.32)))
 * material.colorNode = vec3(max(dot(effectNormalNode(effect), lightDir), 0))
 * ```
 */
export const effectNormalNode = (effect: Effect, options: DisplacementOptions = {}): Vec3Node => {
  const { time = TSL.float(0) as unknown as Node, amount = DISPLACEMENT, epsilon = 1 / 384, planeSize = 2 } = options
  const fn = effectFn(effect)
  const step = epsilon * planeSize

  if (effect.domain === 'position') {
    // Solid domain: step along the surface's own x/y, which both point the
    // usual way, so the tangents cross straight into +Z.
    const p = options.position ?? (TSL.positionGeometry as unknown as Vec3Node)
    const h = fn(p, time)
    const hx = fn(p.add(TSL.vec3(epsilon, 0, 0)), time)
    const hy = fn(p.add(TSL.vec3(0, epsilon, 0)), time)
    const tx = TSL.vec3(step, 0, hx.sub(h).mul(amount))
    const ty = TSL.vec3(0, step, hy.sub(h).mul(amount))
    return TSL.normalize(TSL.cross(tx, ty))
  }

  const uv = options.uv ?? defaultUv()
  const h = fn(uv, time)
  const hx = fn(TSL.vec2(uv.x.add(epsilon), uv.y), time)
  const hy = fn(TSL.vec2(uv.x, uv.y.add(epsilon)), time)
  const tx = TSL.vec3(step, 0, hx.sub(h).mul(amount))
  // uv.y points down, so the second tangent runs along -Y; crossing ty x tx
  // keeps the normal on the +Z (displacement) side.
  const ty = TSL.vec3(0, -step, hy.sub(h).mul(amount))
  return TSL.normalize(TSL.cross(ty, tx))
}

export { DISPLACEMENT, PLANE_SEGMENTS } from './render/types'
