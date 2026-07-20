import { useEffect, useMemo, useState } from 'react'

import { TIER_CLASS } from '#/components/CostBadge'
import NoiseCanvas from '#/components/NoiseCanvas'
import NoisePicker from '#/components/NoisePicker'
import Segmented from '#/components/Segmented'
import Head from 'next/head'
import Link from 'next/link'
import { BLEND_MODES, createEffect, defaultVariant, getNoise, getVariant, NOISES, TIER_LABEL } from 'noisetoy'

import type { PickerDraft, PickerStack } from '#/components/NoisePicker'
import type { Backend, BlendMode, FractalStyle, LayerSpec, NoiseDef, NoiseVariant, ViewMode } from 'noisetoy'

const STYLES: FractalStyle[] = ['basic', 'billow', 'ridged']

const SCALES = [0.25, 0.5, 1, 2, 4]

const actionButtonClass =
  'flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50'

const copyButtonClass =
  'flex-1 rounded-md bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-white'

const selectClass = 'rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs text-zinc-300'

type UILayer = PickerDraft & {
  id: number
  blend: BlendMode
  opacity: number
  /** Hidden layers are dropped from the effect entirely, so they cost nothing to render. */
  hidden?: boolean
}

const SPEEDS = [0, 0.25, 0.5, 1, 2, 4]

const GAINS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

let nextLayerId = 2

const firstNoise = NOISES[0] as NoiseDef

const resolveNoise = (l: PickerDraft): NoiseDef => getNoise(l.noiseId) ?? firstNoise

const resolveVariant = (l: PickerDraft): NoiseVariant => getVariant(resolveNoise(l), l.variantId)

export default function Home() {
  const [layers, setLayers] = useState<UILayer[]>([
    {
      id: 1,
      noiseId: 'perlin',
      variantId: 'perlin-3d',
      octaves: 1,
      gain: 0.5,
      style: 'basic',
      blend: 'normal',
      opacity: 1,
      scaleMul: 1,
      speed: 0,
      angle: 0,
    },
  ])
  const [selectedId, setSelectedId] = useState(1)
  const [backend, setBackend] = useState<Backend>('webgl')
  const [view, setView] = useState<ViewMode>('2d')
  const [tiled, setTiled] = useState(false)
  const [hasWebgpu, setHasWebgpu] = useState(false)
  const [copied, setCopied] = useState<'json' | 'glsl' | 'wgsl' | 'tsl' | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  /** Open noise picker: 'add' appends a layer, a number edits that layer's noise. */
  const [picking, setPicking] = useState<'add' | number | null>(null)
  /** True while a file is dragged anywhere over the window. */
  const [dropActive, setDropActive] = useState(false)
  /** Layer being dragged, and whether the drag started from its handle. */
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragArmed, setDragArmed] = useState(false)

  useEffect(() => {
    if ('gpu' in navigator) {
      setHasWebgpu(true)
      setBackend('webgpu')
    }
  }, [])

  const selected = layers.find(l => l.id === selectedId) ?? (layers[0] as UILayer)

  const effect = useMemo(() => {
    const visible = layers.filter(l => !l.hidden)
    // A stack with everything hidden still needs a valid spec, so it keeps one
    // layer at zero opacity: the accumulator starts at 0, so that renders black.
    const active = visible.length > 0 ? visible : [{ ...(layers[0] as UILayer), opacity: 0 }]
    return createEffect({
      tiled,
      // The 3D views read the stack in 3D space: no uv wrap seam on the
      // sphere, and both views slice the same volume. Tiling is the one
      // exception — it needs the wrapped uv code paths.
      domain: view === 'sphere' || (view === 'plane' && !tiled) ? 'position' : 'uv',
      layers: active.map(l => ({
        noise: l.noiseId,
        variant: l.variantId,
        octaves: l.octaves,
        gain: l.gain,
        style: l.style,
        scale: l.scaleMul,
        blend: l.blend,
        opacity: l.opacity,
        speed: l.speed,
        angle: l.angle,
      })),
    })
  }, [layers, tiled, view])

  const cost = effect.cost()

  const allTileable = effect.tileable

  useEffect(() => {
    if (tiled && !allTileable) setTiled(false)
  }, [tiled, allTileable])

  /** The 3D view is rendered by the Three.js backend, so the two stay in sync. */
  const selectView = (v: ViewMode) => {
    setView(v)
    if (v !== '2d') setBackend('three')
  }

  const selectBackend = (b: Backend) => {
    setBackend(b)
    if (b !== 'three') setView('2d')
  }

  const updateLayer = (id: number, patch: Partial<UILayer>) =>
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))

  const confirmPicker = (draft: PickerDraft) => {
    if (picking === 'add') {
      const id = nextLayerId++
      setLayers(prev => [...prev, { ...draft, id, blend: 'multiply', opacity: 1 }])
      setSelectedId(id)
    } else if (typeof picking === 'number') {
      updateLayer(picking, draft)
    }
    setPicking(null)
  }

  const removeLayer = (id: number) => {
    setLayers(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(l => l.id !== id)
      if (id === selectedId) setSelectedId((next[next.length - 1] as UILayer).id)
      return next
    })
  }

  const copyToClipboard = (kind: 'json' | 'glsl' | 'wgsl' | 'tsl', text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(kind)
        setTimeout(() => setCopied(k => (k === kind ? null : k)), 1500)
      })
      .catch(() => {})
  }

  /** noisetoy-perlin-worley.json — the chain's noise ids, in stack order. */
  const exportFileName = `noisetoy-${layers.map(l => l.noiseId).join('-')}.json`

  const exportJson = () => {
    const text = JSON.stringify(
      {
        version: 1,
        layers: layers.map(l => ({
          noise: l.noiseId,
          variant: l.variantId,
          octaves: l.octaves,
          gain: l.gain,
          style: l.style,
          blend: l.blend,
          opacity: l.opacity,
          scale: l.scaleMul,
          speed: l.speed,
          angle: l.angle,
        })),
      },
      null,
      2,
    )
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName
    a.click()
    URL.revokeObjectURL(url)
    setCopied('json')
    setTimeout(() => setCopied(k => (k === 'json' ? null : k)), 1500)
  }

  const copyShader = (kind: 'glsl' | 'wgsl' | 'tsl') =>
    copyToClipboard(kind, kind === 'glsl' ? effect.glsl() : kind === 'wgsl' ? effect.wgsl() : effect.tsl())

  const applyImportText = (text: string) => {
    try {
      const data = JSON.parse(text) as unknown
      const arr = Array.isArray(data)
        ? data
        : Array.isArray((data as { layers?: unknown }).layers)
          ? ((data as { layers: unknown[] }).layers as unknown[])
          : null
      if (!arr || arr.length === 0) throw new Error('Expected { "layers": [...] } with at least one layer')
      const parsed = arr.map((raw, i) => {
        const o = (raw ?? {}) as Record<string, unknown>
        const n = getNoise(String(o.noise ?? ''))
        if (!n) throw new Error(`Layer ${i + 1}: unknown noise "${String(o.noise)}"`)
        const v = n.variants.find(x => x.id === o.variant) ?? defaultVariant(n)
        const octaves = Math.min(10, Math.max(1, Math.round(Number(o.octaves)) || 1))
        const style = STYLES.includes(o.style as FractalStyle) ? (o.style as FractalStyle) : 'basic'
        const gain = GAINS.includes(Number(o.gain)) ? Number(o.gain) : 0.5
        const blend = BLEND_MODES.some(m => m.id === o.blend) ? (o.blend as BlendMode) : 'normal'
        const rawOpacity = Number(o.opacity)
        const opacity = Number.isFinite(rawOpacity) ? Math.min(1, Math.max(0, rawOpacity)) : 1
        const scaleMul = SCALES.includes(Number(o.scale)) ? Number(o.scale) : 1
        const speed = SPEEDS.includes(Number(o.speed)) ? Number(o.speed) : 0
        const rawAngle = Number(o.angle)
        const angle = Number.isFinite(rawAngle) ? ((rawAngle % 360) + 360) % 360 : 0
        return {
          id: nextLayerId++,
          noiseId: n.id,
          variantId: v.id,
          octaves,
          gain,
          style,
          blend,
          opacity,
          scaleMul,
          speed,
          angle,
        }
      })
      setLayers(parsed)
      setSelectedId((parsed[parsed.length - 1] as UILayer).id)
      setImportOpen(false)
      setImportText('')
      setImportError(null)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }

  const applyImport = () => applyImportText(importText)

  // Dropping a config file anywhere on the page imports it. Layer reordering
  // drags carry no files, so they never light up the overlay.
  useEffect(() => {
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onOver = (e: DragEvent) => {
      if (!hasFile(e)) return
      e.preventDefault() // without this the browser navigates to the file
      setDropActive(true)
    }
    // Fires for every child element left behind, so only the drag actually
    // leaving the window (no relatedTarget) clears the overlay.
    const onLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDropActive(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFile(e)) return
      e.preventDefault()
      setDropActive(false)
      const file = e.dataTransfer?.files[0]
      if (!file) return
      file
        .text()
        .then(text => {
          setImportOpen(false)
          applyImportText(text)
        })
        .catch(() => setImportError(`Could not read ${file.name}`))
    }
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  })

  /** Moves the dragged layer into the dropped-on layer's slot. */
  const reorderLayer = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return
    setLayers(prev => {
      const from = prev.findIndex(l => l.id === sourceId)
      const to = prev.findIndex(l => l.id === targetId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved as UILayer)
      return next
    })
  }

  /** Layers around the one being picked, so the preview can composite in context. */
  const pickerStack = useMemo((): PickerStack | null => {
    const toSpec = (l: UILayer): LayerSpec => ({
      noise: l.noiseId,
      variant: l.variantId,
      octaves: l.octaves,
      gain: l.gain,
      style: l.style,
      scale: l.scaleMul,
      blend: l.blend,
      opacity: l.opacity,
      speed: l.speed,
      angle: l.angle,
    })
    const visible = layers.filter(l => !l.hidden)
    if (picking === 'add') {
      // A new layer lands on top of everything, with the blend confirmPicker gives it.
      return visible.length > 0 ? { below: visible.map(toSpec), above: [], blend: 'multiply', opacity: 1 } : null
    }
    if (typeof picking !== 'number') return null
    const i = visible.findIndex(l => l.id === picking)
    // A lone base layer is the whole stack, so "as layer" would show nothing new.
    if (i < 0 || visible.length <= 1) return null
    const self = visible[i] as UILayer
    return {
      below: visible.slice(0, i).map(toSpec),
      above: visible.slice(i + 1).map(toSpec),
      // The bottom layer composites straight onto the accumulator.
      blend: i === 0 ? 'normal' : self.blend,
      opacity: i === 0 ? 1 : self.opacity,
    }
  }, [layers, picking])

  const pickerInitial: PickerDraft =
    typeof picking === 'number' ? (layers.find(l => l.id === picking) ?? selected) : selected

  return (
    <>
      <Head>
        <title>noisetoy — noise functions with TS / GLSL / WGSL / TSL parity</title>
      </Head>
      <div className="flex h-full bg-zinc-950 text-zinc-100">
        {dropActive && (
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl border-2 border-dashed border-zinc-500 px-10 py-8 text-center">
              <p className="text-lg font-semibold text-zinc-100">Drop to load layers</p>
              <p className="mt-1 text-xs text-zinc-400">a noisetoy JSON config</p>
            </div>
          </div>
        )}
        {importError && !importOpen && (
          <div className="fixed top-4 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-md border border-red-500/40 bg-red-950/90 px-4 py-2 text-xs text-red-200 shadow-lg">
            {importError}
            <button
              onClick={() => setImportError(null)}
              aria-label="Dismiss"
              className="ml-3 text-red-300 hover:text-red-100"
            >
              ×
            </button>
          </div>
        )}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-800 p-4">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-lg font-semibold">noisetoy</h1>
            <a
              href="https://github.com/verekia/noisetoy"
              target="_blank"
              rel="noreferrer"
              title="GitHub repository"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-label="GitHub">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>
          </div>
          <ul className="space-y-2">
            {layers.map(l => {
              const n = resolveNoise(l)
              const v = resolveVariant(l)
              const isBottom = (layers[0] as UILayer).id === l.id
              return (
                <li
                  key={l.id}
                  draggable={dragArmed}
                  onDragStart={() => setDragId(l.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setDragArmed(false)
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    if (dragId !== null) reorderLayer(dragId, l.id)
                  }}
                >
                  <div
                    onClick={() => setSelectedId(l.id)}
                    className={`relative rounded-md border border-zinc-700 p-2.5 ${
                      dragId === l.id ? 'opacity-40' : l.hidden ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        onMouseDown={() => setDragArmed(true)}
                        onMouseUp={() => setDragArmed(false)}
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                        className="shrink-0 cursor-grab px-1 text-base leading-none text-zinc-600 select-none hover:text-zinc-300 active:cursor-grabbing"
                      >
                        ⠿
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedId(l.id)
                          setPicking(l.id)
                        }}
                        title="Change noise"
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800 px-3 py-2 text-left text-base font-semibold text-zinc-50 shadow-sm transition-colors hover:from-zinc-600 hover:to-zinc-700"
                      >
                        <span className="truncate">{n.name}</span>
                        <span aria-hidden className="shrink-0 text-xs text-zinc-400">
                          ▼
                        </span>
                      </button>
                      <span className="flex shrink-0 items-center gap-0.5 text-zinc-500">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            updateLayer(l.id, { hidden: !l.hidden })
                          }}
                          title={l.hidden ? 'Show layer' : 'Hide layer'}
                          aria-label={l.hidden ? 'Show layer' : 'Hide layer'}
                          aria-pressed={!l.hidden}
                          className="rounded px-1 py-1 hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          >
                            <path d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8Z" />
                            <circle cx="8" cy="8" r="1.9" />
                            {l.hidden && <path d="M2.5 13.5 13.5 2.5" />}
                          </svg>
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            removeLayer(l.id)
                          }}
                          disabled={layers.length <= 1}
                          title="Remove layer"
                          className="rounded px-1 hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                    <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-2">
                        {n.variants.length > 1 && (
                          <Segmented
                            value={v.id}
                            onChange={id => updateLayer(l.id, { variantId: id })}
                            options={n.variants.map(x => ({
                              value: x.id,
                              label: x.dim === 3 ? '3D (animated)' : '2D (static)',
                            }))}
                          />
                        )}
                        <Segmented
                          value={l.style}
                          onChange={style => updateLayer(l.id, { style })}
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
                            value={l.octaves}
                            onChange={e => updateLayer(l.id, { octaves: Number(e.target.value) })}
                            className={selectClass}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(o => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </label>
                        {l.octaves > 1 && (
                          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                            Gain
                            <select
                              value={l.gain}
                              onChange={e => updateLayer(l.id, { gain: Number(e.target.value) })}
                              className={selectClass}
                            >
                              {GAINS.map(g => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                          Scale
                          <select
                            value={l.scaleMul}
                            onChange={e => updateLayer(l.id, { scaleMul: Number(e.target.value) })}
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
                            value={l.speed}
                            onChange={e => updateLayer(l.id, { speed: Number(e.target.value) })}
                            className={selectClass}
                          >
                            {SPEEDS.map(sp => (
                              <option key={sp} value={sp}>
                                {sp === 0 ? 'off' : `${sp}/s`}
                              </option>
                            ))}
                          </select>
                        </label>
                        {l.speed > 0 && (
                          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                            Angle
                            <input
                              type="number"
                              min={0}
                              max={359}
                              step={15}
                              value={l.angle}
                              onChange={e => updateLayer(l.id, { angle: ((Number(e.target.value) % 360) + 360) % 360 })}
                              className={`w-16 ${selectClass}`}
                            />
                            °
                          </label>
                        )}
                      </div>
                    </div>
                    {!isBottom && (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={l.blend}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateLayer(l.id, { blend: e.target.value as BlendMode })}
                          className={`w-24 shrink-0 ${selectClass}`}
                        >
                          {BLEND_MODES.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(l.opacity * 100)}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateLayer(l.id, { opacity: Number(e.target.value) / 100 })}
                          className="h-1 min-w-0 flex-1 accent-zinc-300"
                        />
                        <span className="w-8 shrink-0 text-right font-mono text-[10px] text-zinc-500">
                          {Math.round(l.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <button
            onClick={() => setPicking('add')}
            className="mt-3 w-full rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-50 shadow-sm transition-colors hover:from-zinc-600 hover:to-zinc-700"
          >
            + Add layer
          </button>
          <div className="mt-auto space-y-2 pt-4">
            <div className="flex items-baseline justify-between rounded-md border border-zinc-800 px-2.5 py-2 text-xs">
              <span className="text-zinc-500">Estimated cost</span>
              <span className={`font-medium ${TIER_CLASS[cost.tier]}`}>
                {TIER_LABEL[cost.tier]} · {cost.units.toFixed(cost.units < 10 ? 1 : 0)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportJson} className={actionButtonClass}>
                {copied === 'json' ? 'Saved ✓' : 'Export JSON'}
              </button>
              <button
                onClick={() => {
                  setImportOpen(o => !o)
                  setImportError(null)
                }}
                className={actionButtonClass}
              >
                Import JSON
              </button>
            </div>
            {importOpen && (
              <div className="space-y-2">
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder='Paste layer JSON, e.g. { "layers": [{ "noise": "perlin", ... }] }'
                  rows={6}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300 placeholder:text-zinc-600"
                />
                {importError && <p className="text-[11px] text-red-400">{importError}</p>}
                <div className="flex gap-2">
                  <button onClick={applyImport} className={actionButtonClass}>
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setImportOpen(false)
                      setImportError(null)
                    }}
                    className={actionButtonClass}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => copyShader('glsl')} className={copyButtonClass}>
                {copied === 'glsl' ? 'Copied ✓' : 'Copy GLSL'}
              </button>
              <button onClick={() => copyShader('wgsl')} className={copyButtonClass}>
                {copied === 'wgsl' ? 'Copied ✓' : 'Copy WGSL'}
              </button>
              <button onClick={() => copyShader('tsl')} className={copyButtonClass}>
                {copied === 'tsl' ? 'Copied ✓' : 'Copy TSL'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 text-xs text-zinc-500">
            <span>
              by{' '}
              <a
                href="https://verekia.com/"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:text-zinc-100 hover:underline"
              >
                verekia
              </a>
            </span>
            <Link
              href="/bench"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              Benchmarks →
            </Link>
          </div>
        </aside>
        {/* The 3D views fill the pane edge to edge; the flat view keeps breathing room. */}
        <main
          className={`relative flex flex-1 items-center justify-center overflow-hidden ${view === '2d' ? 'p-6' : ''}`}
        >
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
            <Segmented
              value={backend}
              onChange={selectBackend}
              options={[
                { value: 'js', label: 'JS' },
                { value: 'webgl', label: 'WebGL' },
                {
                  value: 'webgpu',
                  label: 'WebGPU',
                  disabled: !hasWebgpu,
                  title: hasWebgpu ? undefined : 'WebGPU is not available in this browser',
                },
                {
                  value: 'three',
                  label: 'Three.js',
                  disabled: !hasWebgpu,
                  title: hasWebgpu
                    ? 'Three.js WebGPURenderer with TSL node materials'
                    : 'The Three.js (TSL) backend requires WebGPU',
                },
              ]}
            />
            <Segmented
              value={view}
              onChange={selectView}
              options={[
                { value: '2d', label: '2D' },
                {
                  value: 'plane',
                  label: '3D plane',
                  disabled: !hasWebgpu,
                  title: hasWebgpu ? 'Displace a subdivided plane (Three.js)' : 'The 3D views require WebGPU',
                },
                {
                  value: 'sphere',
                  label: '3D sphere',
                  disabled: !hasWebgpu,
                  title: hasWebgpu ? 'Displace a subdivided sphere (Three.js)' : 'The 3D views require WebGPU',
                },
              ]}
            />
            {/* A sphere always reads the solid field, where tiling has no meaning. */}
            {view === 'sphere' ? null : allTileable ? (
              <Segmented
                value={tiled}
                onChange={setTiled}
                options={[
                  { value: false, label: '1×' },
                  { value: true, label: '4× tiles' },
                ]}
              />
            ) : (
              <span className="px-1 text-xs text-zinc-500">Not tileable</span>
            )}
          </div>
          <NoiseCanvas effect={effect} backend={backend} view={view} />
        </main>
      </div>
      {picking !== null && (
        <NoisePicker
          initial={pickerInitial}
          mode={picking === 'add' ? 'add' : 'edit'}
          backend={backend === 'three' ? 'webgpu' : backend}
          stack={pickerStack}
          onCancel={() => setPicking(null)}
          onConfirm={confirmPicker}
        />
      )}
    </>
  )
}
