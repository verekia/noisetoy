import { useEffect, useMemo, useState } from 'react'

import CostBadge from '#/components/CostBadge'
import NoiseCanvas from '#/components/NoiseCanvas'
import Segmented from '#/components/Segmented'
import { createEffect, defaultVariant, getNoise, getVariant, NOISES, variantCost } from 'noisetoy'
// The implementation inventory is a separate entry point on purpose: it is
// reference material for benchmarking, and consumers of the library never ship
// it. The explorer is exactly the consumer that should.
import {
  EVIDENCE_LABEL,
  IMPLEMENTATION_KIND_BLURB,
  IMPLEMENTATION_KIND_LABEL,
  implementationOf,
} from 'noisetoy/implementations'

import type { Backend, BlendMode, FractalStyle, LayerSpec, NoiseDef } from 'noisetoy'
import type { ImplementationKind } from 'noisetoy/implementations'

/** The per-layer settings the picker edits (blend and opacity stay in the sidebar). */
export type PickerDraft = {
  noiseId: string
  variantId: string
  octaves: number
  /** Rotate octaves (classic fBm construction) instead of offsetting them; breaks tiling. */
  rotate: boolean
  style: FractalStyle
  scaleMul: number
  /** Translation speed in lattice cells per second (0 = off). */
  speed: number
  /** Translation heading in degrees: 0 is right, 90 is up. */
  angle: number
}

const SCALES = [0.25, 0.5, 1, 2, 4]

const SPEEDS = [0, 0.25, 0.5, 1, 2, 4]

/** Implementations of published algorithms first, this repo's originals after. */
const SORTED_NOISES = NOISES.toSorted((a, b) => Number(Boolean(a.original)) - Number(Boolean(b.original)))

const selectClass = 'rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-xs text-zinc-300'

/**
 * Canonical reads as "trust this matches the paper", alternative as "we went
 * our own way here, on purpose", novel as "there is nothing to compare to".
 * Colour carries that ordering; the tooltip carries the meaning.
 */
const KIND_CLASS: Record<ImplementationKind, string> = {
  canonical: 'bg-emerald-950 text-emerald-300 ring-emerald-900',
  alternative: 'bg-amber-950 text-amber-300 ring-amber-900',
  conventional: 'bg-sky-950 text-sky-300 ring-sky-900',
  novel: 'bg-violet-950 text-violet-300 ring-violet-900',
}

/**
 * The rest of the stack this layer lands in, so the preview can show it in
 * context. Null when the layer is the whole stack (swapping a lone base
 * layer), where an "as layer" preview would be identical to the isolated one.
 */
export type PickerStack = {
  below: LayerSpec[]
  above: LayerSpec[]
  blend: BlendMode
  opacity: number
}

const NoisePicker = ({
  initial,
  mode,
  backend,
  stack,
  onCancel,
  onConfirm,
}: {
  initial: PickerDraft
  mode: 'add' | 'edit'
  /** Backend used for the preview; the preview is always flat and untiled. */
  backend: Backend
  stack: PickerStack | null
  onCancel: () => void
  onConfirm: (draft: PickerDraft) => void
}) => {
  const [draft, setDraft] = useState<PickerDraft>(initial)
  const [preview, setPreview] = useState<'layer' | 'isolated'>('layer')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const noise = getNoise(draft.noiseId) ?? (NOISES[0] as NoiseDef)
  const variant = getVariant(noise, draft.variantId)
  // Per variant, not per noise: once a noise carries more than one
  // implementation, the selected variant is what says which one you are looking at.
  const implementation = implementationOf(variant.id)

  const draftLayer: LayerSpec = {
    noise: draft.noiseId,
    variant: draft.variantId,
    octaves: draft.octaves,
    rotate: draft.rotate,
    style: draft.style,
    scale: draft.scaleMul,
    speed: draft.speed,
    angle: draft.angle,
  }
  const asLayer = preview === 'layer' && stack !== null
  // Serialized so the memo keys on the stack's contents rather than on an
  // object identity the parent rebuilds every render.
  const stackKey = stack ? JSON.stringify(stack) : ''

  const previewEffect = useMemo(
    () =>
      createEffect({
        layers:
          asLayer && stack
            ? [...stack.below, { ...draftLayer, blend: stack.blend, opacity: stack.opacity }, ...stack.above]
            : [draftLayer],
      }),
    // draftLayer and stack are rebuilt each render, so key on their contents.
    // oxlint-disable-next-line exhaustive-deps
    [
      draft.noiseId,
      draft.variantId,
      draft.octaves,
      draft.rotate,
      draft.style,
      draft.scaleMul,
      draft.speed,
      draft.angle,
      asLayer,
      stackKey,
    ],
  )

  const selectNoise = (n: NoiseDef) => setDraft(d => ({ ...d, noiseId: n.id, variantId: defaultVariant(n).id }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'add' ? 'Add a layer' : 'Change noise'}
        onClick={e => e.stopPropagation()}
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="text-base font-semibold">{mode === 'add' ? 'Add a layer' : 'Change noise'}</h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded px-2 py-0.5 text-lg leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ×
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[13rem_1fr] gap-5 overflow-hidden p-5">
          <ul className="min-h-0 space-y-0.5 overflow-y-auto pr-1">
            {SORTED_NOISES.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => selectNoise(n)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm ${
                    n.id === noise.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate">{n.name}</span>
                  {n.original && (
                    <span className="shrink-0 rounded-sm bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                      Original
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <div className="flex gap-4">
              <div className="w-56 shrink-0 space-y-2">
                <div className="aspect-square">
                  <NoiseCanvas effect={previewEffect} backend={backend} />
                </div>
                {stack !== null && (
                  <div className="flex">
                    <Segmented
                      value={preview}
                      onChange={setPreview}
                      options={[
                        { value: 'layer', label: 'As layer' },
                        { value: 'isolated', label: 'Isolated' },
                      ]}
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{noise.name}</h3>
                {noise.original && <p className="mt-1 text-xs font-medium text-zinc-300">Noisetoy Original</p>}
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{noise.description}</p>
                {implementation && (
                  <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        title={IMPLEMENTATION_KIND_BLURB[implementation.kind]}
                        className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${KIND_CLASS[implementation.kind]}`}
                      >
                        {IMPLEMENTATION_KIND_LABEL[implementation.kind]}
                      </span>
                      <span className="text-xs text-zinc-300">{implementation.name}</span>
                    </div>
                    {/* Never show the claim without what backs it: a bare
                        "Canonical" is exactly what misled us before. */}
                    <p className="mt-1 text-[10px] text-zinc-500">{EVIDENCE_LABEL[implementation.evidence]}</p>
                    {implementation.follows && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                        Follows {implementation.follows}.
                      </p>
                    )}
                    {implementation.reference?.licence && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                        Reference licence: {implementation.reference.licence}
                      </p>
                    )}
                    {implementation.deviations && implementation.deviations.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
                          {implementation.deviations.length} deviation
                          {implementation.deviations.length > 1 ? 's' : ''} from the reference
                        </summary>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-500">
                          {implementation.deviations.map(d => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {implementation.rationale && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
                          Why it is written this way
                        </summary>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{implementation.rationale}</p>
                      </details>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-zinc-500">
                  Cost{' '}
                  <CostBadge
                    units={variantCost(variant.id, draft.octaves)}
                    title={`Relative to Perlin 3D at one octave = 1. ${draft.octaves} octave${draft.octaves > 1 ? 's' : ''} of ${variant.label}.`}
                  />
                  {draft.octaves > 1 && <span className="text-zinc-600"> ({draft.octaves} octaves)</span>}
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">{noise.license}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {noise.variants.length > 1 && (
                  <Segmented
                    value={variant.id}
                    onChange={id => setDraft(d => ({ ...d, variantId: id }))}
                    options={noise.variants.map(v => ({
                      value: v.id,
                      label: v.dim === 3 ? '3D (animated)' : '2D (static)',
                    }))}
                  />
                )}
                <Segmented
                  value={draft.style}
                  onChange={style => setDraft(d => ({ ...d, style }))}
                  options={[
                    { value: 'basic', label: 'Basic' },
                    { value: 'billow', label: 'Billow' },
                    { value: 'ridged', label: 'Ridged' },
                  ]}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Octaves
                  <select
                    value={draft.octaves}
                    onChange={e => setDraft(d => ({ ...d, octaves: Number(e.target.value) }))}
                    className={selectClass}
                  >
                    {[1, 2, 3, 4, 5, 6].map(o => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.octaves > 1 && (
                  <label
                    className="flex items-center gap-1.5 text-xs text-zinc-500"
                    title="Classic fBm construction: rotated octaves, stronger decorrelation. Breaks tiling."
                  >
                    fBm
                    <input
                      type="checkbox"
                      checked={draft.rotate}
                      onChange={e => setDraft(d => ({ ...d, rotate: e.target.checked }))}
                    />
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Scale
                  <select
                    value={draft.scaleMul}
                    onChange={e => setDraft(d => ({ ...d, scaleMul: Number(e.target.value) }))}
                    className={selectClass}
                  >
                    {SCALES.map(s => (
                      <option key={s} value={s}>
                        {s}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Drift
                  <select
                    value={draft.speed}
                    onChange={e => setDraft(d => ({ ...d, speed: Number(e.target.value) }))}
                    className={selectClass}
                  >
                    {SPEEDS.map(sp => (
                      <option key={sp} value={sp}>
                        {sp === 0 ? 'off' : `${sp}/s`}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.speed > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                    Angle
                    <input
                      type="number"
                      min={0}
                      max={359}
                      step={15}
                      value={draft.angle}
                      onChange={e => setDraft(d => ({ ...d, angle: ((Number(e.target.value) % 360) + 360) % 360 }))}
                      className={`w-16 ${selectClass}`}
                    />
                    °
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(draft)}
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            {mode === 'add' ? 'Add layer' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default NoisePicker
