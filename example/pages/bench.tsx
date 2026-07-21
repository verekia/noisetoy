import { useEffect, useState } from 'react'

import Segmented from '#/components/Segmented'
import { benchJsVariant } from '#/lib/bench'
import {
  benchThreeAlt,
  benchThreeVariant,
  benchWebglAlt,
  benchWebglVariant,
  benchWebgpuAlt,
  benchWebgpuVariant,
} from '#/lib/bench-gpu'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getNoise, NOISES } from 'noisetoy'
// Non-shipping implementations (candidates, superseded) bench through their
// AltVariants — TS samplers for the JS column, GLSL/WGSL/TSL specs for the
// GPU columns — so every implementation gets the full row.
import { ALT_VARIANTS } from 'noisetoy/implementations'

import type { BenchResult } from '#/lib/bench'
import type { Backend, NoiseVariant } from 'noisetoy'
import type { AltVariant } from 'noisetoy/implementations'

const JS_SIZE = 256
const GPU_SIZE = 512

type DimFilter = '' | '2d' | '3d'

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

const rowsFor = (noises: typeof NOISES, dim: DimFilter): Row[] =>
  noises.flatMap(noise =>
    noise.variants
      .filter(variant => dim === '' || variant.dim === (dim === '2d' ? 2 : 3))
      .flatMap(variant => [
        { key: variant.id, noiseId: noise.id, scale: noise.scale, variant, alt: null },
        ...ALT_VARIANTS.filter(a => a.variantId === variant.id).map(alt => ({
          key: alt.id,
          noiseId: noise.id,
          scale: noise.scale,
          variant: null,
          alt,
        })),
      ]),
  )

export default function Bench() {
  const router = useRouter()
  const [results, setResults] = useState<Record<string, Cell>>({})
  const [running, setRunning] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('variant')
  const [sortDesc, setSortDesc] = useState(true)

  // The filters live in the URL (?noise=perlin&dim=3d) so a single
  // algorithm's implementations — or just its 3D variants — can be
  // benchmarked from a link; the controls mirror the URL.
  const rawParam = typeof router.query.noise === 'string' ? router.query.noise : ''
  const noiseFilter = rawParam && getNoise(rawParam) ? rawParam : ''
  const rawDim = typeof router.query.dim === 'string' ? router.query.dim : ''
  const dimFilter: DimFilter = rawDim === '2d' || rawDim === '3d' ? rawDim : ''
  useEffect(() => {
    if (router.isReady && ((rawParam && !getNoise(rawParam)) || (rawDim && rawDim !== dimFilter))) {
      const query: Record<string, string> = {}
      if (noiseFilter) query.noise = noiseFilter
      if (dimFilter) query.dim = dimFilter
      void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
    }
  }, [router, rawParam, rawDim, noiseFilter, dimFilter])

  const setFilters = (noise: string, dim: DimFilter) => {
    const query: Record<string, string> = {}
    if (noise) query.noise = noise
    if (dim) query.dim = dim
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
  }

  const filteredNoises = noiseFilter ? NOISES.filter(n => n.id === noiseFilter) : NOISES

  const setCell = (key: string, cell: Cell) => setResults(prev => ({ ...prev, [key]: cell }))

  const run = async () => {
    setRunning(true)
    setResults({})
    const hasWebgpu = 'gpu' in navigator
    try {
      for (const row of rowsFor(filteredNoises, dimFilter)) {
        const backends: { id: Backend; exec: (() => Promise<BenchResult> | BenchResult) | null }[] = row.variant
          ? [
              { id: 'js', exec: () => benchJsVariant(row.variant as NoiseVariant, row.scale, JS_SIZE) },
              { id: 'webgl', exec: () => benchWebglVariant(row.variant as NoiseVariant, row.noiseId, GPU_SIZE) },
              { id: 'webgpu', exec: () => benchWebgpuVariant(row.variant as NoiseVariant, row.noiseId, GPU_SIZE) },
              { id: 'three', exec: () => benchThreeVariant(row.variant as NoiseVariant, row.noiseId, GPU_SIZE) },
            ]
          : [
              { id: 'js', exec: () => benchJsVariant(row.alt as AltVariant, row.scale, JS_SIZE) },
              { id: 'webgl', exec: () => benchWebglAlt(row.alt as AltVariant, GPU_SIZE) },
              { id: 'webgpu', exec: () => benchWebgpuAlt(row.alt as AltVariant, GPU_SIZE) },
              { id: 'three', exec: () => benchThreeAlt(row.alt as AltVariant, GPU_SIZE) },
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

  const allRows = rowsFor(filteredNoises, dimFilter)

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
  // column's fastest": under 1.5x slower is green, under 2x yellow, under 3x
  // orange, beyond that red.
  const columnMax: Record<Backend, number> = { js: 0, webgl: 0, webgpu: 0, three: 0 }
  for (const row of allRows) {
    for (const backend of ['js', 'webgl', 'webgpu', 'three'] as Backend[]) {
      const v = cellValue(row.key, backend)
      if (v !== null && v > columnMax[backend]) columnMax[backend] = v
    }
  }

  const perfClass = (value: number, max: number): string =>
    max <= 0 || value >= max / 1.5
      ? 'text-emerald-400'
      : value >= max / 2
        ? 'text-yellow-400'
        : value >= max / 3
          ? 'text-orange-400'
          : 'text-red-400'

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
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">
                  bun run bench{noiseFilter ? ` ${noiseFilter}` : ''}
                </code>
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
              {running
                ? 'Running…'
                : `Run ${noiseFilter || 'all'}${dimFilter ? ` ${dimFilter.toUpperCase()}` : ''} benchmarks`}
            </button>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Noise
              <select
                value={noiseFilter}
                disabled={running}
                onChange={e => setFilters(e.target.value, dimFilter)}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All</option>
                {NOISES.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              value={dimFilter}
              onChange={dim => {
                if (!running) setFilters(noiseFilter, dim)
              }}
              options={[
                { value: '' as DimFilter, label: 'All' },
                { value: '2d' as DimFilter, label: '2D' },
                { value: '3d' as DimFilter, label: '3D' },
              ]}
            />
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
          <p className="mt-3 text-xs text-zinc-500">
            Click a column header to sort. Colors show how much slower a cell is than the fastest in its column:{' '}
            <span className="text-emerald-400">under 1.5×</span>, <span className="text-yellow-400">under 2×</span>,{' '}
            <span className="text-orange-400">under 3×</span>, <span className="text-red-400">3× or more</span>.
          </p>
        </div>
      </div>
    </>
  )
}
