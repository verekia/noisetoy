import { useEffect, useState } from 'react'

import { benchJsVariant } from '#/lib/bench'
import {
  benchThreeAlt,
  benchThreeVariant,
  benchWebglAlt,
  benchWebglVariant,
  benchWebgpuAlt,
  benchWebgpuVariant,
} from '#/lib/bench-gpu'
// Non-shipping implementations (candidates, superseded) bench through their
// AltVariants — TS samplers for the JS column, GLSL/WGSL/TSL specs for the
// GPU columns — so every implementation gets the full row.
import { ALT_VARIANTS } from '#/lib/implementations'
import { NOISES } from '#/lib/registry'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

import type { BenchResult } from '#/lib/bench'
import type { AltVariant } from '#/lib/implementations'
import type { Backend, NoiseVariant } from '#/lib/registry'

const JS_SIZE = 256
const GPU_SIZE = 512

type Dim = '2d' | '3d'

/** Everything benchable: one entry per noise variant, e.g. "Perlin 3D". */
const TARGETS = NOISES.flatMap(noise =>
  noise.variants.map(variant => ({
    noiseId: noise.id,
    dim: (variant.dim === 2 ? '2d' : '3d') as Dim,
    label: `${noise.name} ${variant.dim}D`,
  })),
)

type Cell = BenchResult | 'running' | 'n/a' | { error: string } | undefined

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

type SortCol = 'variant' | Backend

/**
 * One benchmark row: a shipping registry variant, or a non-shipping
 * implementation's AltVariant standing in for the same registry variant.
 */
type Row = {
  key: string
  noiseId: string
  scale: number
  variant: NoiseVariant | null
  alt: AltVariant | null
}

const rowsFor = (noiseId: string, dim: Dim): Row[] => {
  const noise = NOISES.find(n => n.id === noiseId)
  if (!noise) return []
  return noise.variants
    .filter(variant => variant.dim === (dim === '2d' ? 2 : 3))
    .flatMap(variant => [
      { key: variant.id, noiseId: noise.id, scale: noise.scale, variant, alt: null },
      ...ALT_VARIANTS.filter(a => a.variantId === variant.id).map(alt => ({
        key: alt.id,
        noiseId: noise.id,
        scale: noise.scale,
        variant: null,
        alt,
      })),
    ])
}

export default function Bench() {
  const router = useRouter()
  const [results, setResults] = useState<Record<string, Cell>>({})
  const [running, setRunning] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('variant')
  const [sortDesc, setSortDesc] = useState(true)

  // The benchmark always targets exactly one noise variant — the whole suite
  // in one run never produced comparable numbers. The target lives in the URL
  // (?noise=perlin&dim=3d) so it can be shared as a link; the dropdown
  // mirrors it, and anything invalid falls back to the first target.
  const rawNoise = typeof router.query.noise === 'string' ? router.query.noise : ''
  const rawDim = typeof router.query.dim === 'string' ? router.query.dim : ''
  const target =
    TARGETS.find(t => t.noiseId === rawNoise && t.dim === rawDim) ??
    TARGETS.find(t => t.noiseId === rawNoise) ??
    (TARGETS[0] as (typeof TARGETS)[number])
  useEffect(() => {
    if (router.isReady && (rawNoise !== target.noiseId || rawDim !== target.dim)) {
      void router.replace({ pathname: router.pathname, query: { noise: target.noiseId, dim: target.dim } }, undefined, {
        shallow: true,
      })
    }
  }, [router, rawNoise, rawDim, target])

  const setTarget = (noiseId: string, dim: Dim) => {
    void router.replace({ pathname: router.pathname, query: { noise: noiseId, dim } }, undefined, { shallow: true })
  }

  const setCell = (key: string, cell: Cell) => setResults(prev => ({ ...prev, [key]: cell }))

  const run = async () => {
    setRunning(true)
    setResults({})
    const hasWebgpu = 'gpu' in navigator
    try {
      for (const row of rowsFor(target.noiseId, target.dim)) {
        const backends: { id: Backend; exec: (() => Promise<BenchResult> | BenchResult) | null }[] = row.variant
          ? [
              { id: 'js', exec: () => benchJsVariant(row.variant as NoiseVariant, row.scale, JS_SIZE) },
              { id: 'webgl', exec: () => benchWebglVariant(row.variant as NoiseVariant, row.scale, GPU_SIZE) },
              { id: 'webgpu', exec: () => benchWebgpuVariant(row.variant as NoiseVariant, row.scale, GPU_SIZE) },
              { id: 'three', exec: () => benchThreeVariant(row.variant as NoiseVariant, row.scale, GPU_SIZE) },
            ]
          : [
              { id: 'js', exec: () => benchJsVariant(row.alt as AltVariant, row.scale, JS_SIZE) },
              { id: 'webgl', exec: () => benchWebglAlt(row.alt as AltVariant, row.scale, GPU_SIZE) },
              { id: 'webgpu', exec: () => benchWebgpuAlt(row.alt as AltVariant, row.scale, GPU_SIZE) },
              { id: 'three', exec: () => benchThreeAlt(row.alt as AltVariant, row.scale, GPU_SIZE) },
            ]
        for (const { id, exec } of backends) {
          const key = `${row.key}-${id}`
          if (exec === null || ((id === 'webgpu' || id === 'three') && !hasWebgpu)) {
            setCell(key, 'n/a')
            continue
          }
          setCell(key, 'running')
          await nextFrame()
          try {
            setCell(key, await exec())
          } catch (e) {
            setCell(key, { error: e instanceof Error ? e.message : String(e) })
          }
          await nextFrame()
        }
      }
    } finally {
      setRunning(false)
    }
  }

  const cellValue = (rowKey: string, backend: Backend): number | null => {
    const cell = results[`${rowKey}-${backend}`]
    return cell !== undefined && typeof cell === 'object' && 'msamplesPerSec' in cell ? cell.msamplesPerSec : null
  }

  const allRows = rowsFor(target.noiseId, target.dim)

  const rows =
    sortCol === 'variant'
      ? allRows
      : allRows.toSorted((a, b) => {
          const va = cellValue(a.key, sortCol)
          const vb = cellValue(b.key, sortCol)
          if (va === null && vb === null) return 0
          if (va === null) return 1
          if (vb === null) return -1
          return sortDesc ? vb - va : va - vb
        })

  // Relative performance within a column, as "how much slower than the
  // column's fastest": under 1.2x slower is green, under 1.5x yellow, under
  // 1.8x orange, under 2.5x red, beyond that dark red.
  const columnMax: Record<Backend, number> = { js: 0, webgl: 0, webgpu: 0, three: 0 }
  for (const row of allRows) {
    for (const backend of ['js', 'webgl', 'webgpu', 'three'] as Backend[]) {
      const v = cellValue(row.key, backend)
      if (v !== null && v > columnMax[backend]) columnMax[backend] = v
    }
  }

  const perfClass = (value: number, max: number): string =>
    max <= 0 || value >= max / 1.2
      ? 'text-emerald-400'
      : value >= max / 1.5
        ? 'text-yellow-400'
        : value >= max / 1.8
          ? 'text-orange-400'
          : value >= max / 2.5
            ? 'text-red-400'
            : 'text-red-700'

  const sortBy = (col: SortCol) => {
    if (col === sortCol) {
      if (col === 'variant') return
      setSortDesc(d => !d)
    } else {
      setSortCol(col)
      setSortDesc(true)
    }
  }

  const renderCell = (cell: Cell, max: number) => {
    if (cell === undefined) return <span className="text-zinc-600">—</span>
    if (cell === 'running') return <span className="text-amber-400">…</span>
    if (cell === 'n/a') return <span className="text-zinc-600">n/a</span>
    if ('error' in cell)
      return (
        <span className="text-red-400" title={cell.error}>
          error
        </span>
      )
    return (
      <span
        className={perfClass(cell.msamplesPerSec, max)}
        title={`Median of 5 batches; spread ${(cell.spread * 100).toFixed(0)}% across batches`}
      >
        {cell.msamplesPerSec.toFixed(1)}
        <span className="ml-1 text-[10px] text-zinc-500">
          ({cell.msPerFrame.toFixed(2)} ms{cell.spread > 0.1 ? ` ±${Math.round(cell.spread * 50)}%` : ''})
        </span>
      </span>
    )
  }

  const headerCell = (col: SortCol, label: string, extraClass = '') => (
    <th className={`py-2 ${extraClass}`}>
      <button
        onClick={() => sortBy(col)}
        className={`uppercase transition-colors hover:text-zinc-100 ${sortCol === col ? 'text-zinc-100' : ''}`}
        title={col === 'variant' ? 'Registry order' : 'Sort by this column'}
      >
        {label}
        {sortCol === col && col !== 'variant' && <span className="ml-1">{sortDesc ? '↓' : '↑'}</span>}
      </button>
    </th>
  )

  return (
    <>
      <Head>
        <title>noisetoy — Benchmarks</title>
      </Head>
      <div className="min-h-full bg-zinc-950 p-6 text-zinc-100">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-semibold">Benchmarks</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Throughput in Msamples/s (higher is better): median of 5 duration-calibrated batches after a warmup. JS
                benches {JS_SIZE}×{JS_SIZE} frames on the CPU; GPU backends bench {GPU_SIZE}×{GPU_SIZE} frames with full
                sync per batch. Hover a cell for its batch spread; a ± marker means batches disagreed by more than 10%.
                Rows marked with an implementation id are non-shipping implementations from the inventory, benched
                through their AltVariant samplers and shader specs. CLI equivalent:{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">bun run bench {target.noiseId}</code>
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 text-sm whitespace-nowrap text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              ← Viewer
            </Link>
          </div>
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={run}
              disabled={running}
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Running…' : `Run ${target.label} benchmarks`}
            </button>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Noise
              <select
                value={`${target.noiseId}:${target.dim}`}
                disabled={running}
                onChange={e => {
                  const [noiseId, dim] = e.target.value.split(':') as [string, Dim]
                  setTarget(noiseId, dim)
                }}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TARGETS.map(t => (
                  <option key={`${t.noiseId}:${t.dim}`} value={`${t.noiseId}:${t.dim}`}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-xs text-zinc-400">
                {headerCell('variant', 'Variant', 'pr-4')}
                {headerCell('js', 'JS', 'pr-4')}
                {headerCell('webgl', 'WebGL', 'pr-4')}
                {headerCell('webgpu', 'WebGPU', 'pr-4')}
                {headerCell('three', 'TSL')}
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map(row => (
                <tr key={row.key} className="border-b border-zinc-900">
                  <td className="py-2 pr-4 font-sans">
                    {row.alt ? (
                      <>
                        {row.alt.variantId}
                        <span className="ml-1.5 rounded-sm bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {row.alt.implementationId}
                        </span>
                      </>
                    ) : (
                      row.key
                    )}
                  </td>
                  <td className="py-2 pr-4">{renderCell(results[`${row.key}-js`], columnMax.js)}</td>
                  <td className="py-2 pr-4">{renderCell(results[`${row.key}-webgl`], columnMax.webgl)}</td>
                  <td className="py-2 pr-4">{renderCell(results[`${row.key}-webgpu`], columnMax.webgpu)}</td>
                  <td className="py-2">{renderCell(results[`${row.key}-three`], columnMax.three)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
