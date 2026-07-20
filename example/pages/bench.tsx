import { useState } from 'react'

import { benchJsVariant } from '#/lib/bench'
import { benchThreeVariant, benchWebglVariant, benchWebgpuVariant } from '#/lib/bench-gpu'
import Head from 'next/head'
import Link from 'next/link'
import { NOISES } from 'noisetoy'

import type { BenchResult } from '#/lib/bench'
import type { Backend } from 'noisetoy'

const JS_SIZE = 256
const JS_FRAMES = 3
const GPU_SIZE = 512
const GPU_FRAMES = 100

type Cell = BenchResult | 'running' | 'n/a' | { error: string } | undefined

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

type SortCol = 'variant' | Backend

export default function Bench() {
  const [results, setResults] = useState<Record<string, Cell>>({})
  const [running, setRunning] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('variant')
  const [sortDesc, setSortDesc] = useState(true)

  const setCell = (key: string, cell: Cell) => setResults(prev => ({ ...prev, [key]: cell }))

  const run = async () => {
    setRunning(true)
    setResults({})
    const hasWebgpu = 'gpu' in navigator
    try {
      for (const noise of NOISES) {
        for (const variant of noise.variants) {
          const backends: { id: Backend; exec: () => Promise<BenchResult> | BenchResult }[] = [
            { id: 'js', exec: () => benchJsVariant(variant, noise.scale, JS_SIZE, JS_FRAMES) },
            { id: 'webgl', exec: () => benchWebglVariant(variant, noise.id, GPU_SIZE, GPU_FRAMES) },
            { id: 'webgpu', exec: () => benchWebgpuVariant(variant, noise.id, GPU_SIZE, GPU_FRAMES) },
            { id: 'three', exec: () => benchThreeVariant(variant, noise.id, GPU_SIZE, GPU_FRAMES) },
          ]
          for (const { id, exec } of backends) {
            const key = `${variant.id}-${id}`
            if ((id === 'webgpu' || id === 'three') && !hasWebgpu) {
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
      }
    } finally {
      setRunning(false)
    }
  }

  const cellValue = (variantId: string, backend: Backend): number | null => {
    const cell = results[`${variantId}-${backend}`]
    return cell !== undefined && typeof cell === 'object' && 'msamplesPerSec' in cell ? cell.msamplesPerSec : null
  }

  const allRows = NOISES.flatMap(noise => noise.variants.map(variant => ({ scale: noise.scale, variant })))

  const rows =
    sortCol === 'variant'
      ? allRows
      : allRows.toSorted((a, b) => {
          const va = cellValue(a.variant.id, sortCol)
          const vb = cellValue(b.variant.id, sortCol)
          if (va === null && vb === null) return 0
          if (va === null) return 1
          if (vb === null) return -1
          return sortDesc ? vb - va : va - vb
        })

  // Relative performance within a column: >= 1/3 of the column's fastest is
  // green, >= 1/10 is yellow, slower is orange.
  const columnMax: Record<Backend, number> = { js: 0, webgl: 0, webgpu: 0, three: 0 }
  for (const { variant } of allRows) {
    for (const backend of ['js', 'webgl', 'webgpu', 'three'] as Backend[]) {
      const v = cellValue(variant.id, backend)
      if (v !== null && v > columnMax[backend]) columnMax[backend] = v
    }
  }

  const perfClass = (value: number, max: number): string =>
    max <= 0 || value >= max / 3 ? 'text-emerald-400' : value >= max / 10 ? 'text-yellow-400' : 'text-orange-400'

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
      <span className={perfClass(cell.msamplesPerSec, max)}>
        {cell.msamplesPerSec.toFixed(1)}
        <span className="ml-1 text-[10px] text-zinc-500">({cell.msPerFrame.toFixed(2)} ms)</span>
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
                Throughput in Msamples/s (higher is better). JS runs {JS_SIZE}×{JS_SIZE}×{JS_FRAMES} frames on the CPU;
                WebGL/WebGPU run {GPU_SIZE}×{GPU_SIZE}×{GPU_FRAMES} frames with full GPU sync. CLI equivalent:{' '}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">bun run bench</code>
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 text-sm whitespace-nowrap text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              ← Viewer
            </Link>
          </div>
          <button
            onClick={run}
            disabled={running}
            className="mb-6 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run benchmarks'}
          </button>
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
              {rows.map(({ variant }) => (
                <tr key={variant.id} className="border-b border-zinc-900">
                  <td className="py-2 pr-4 font-sans">{variant.id}</td>
                  <td className="py-2 pr-4">{renderCell(results[`${variant.id}-js`], columnMax.js)}</td>
                  <td className="py-2 pr-4">{renderCell(results[`${variant.id}-webgl`], columnMax.webgl)}</td>
                  <td className="py-2 pr-4">{renderCell(results[`${variant.id}-webgpu`], columnMax.webgpu)}</td>
                  <td className="py-2">{renderCell(results[`${variant.id}-three`], columnMax.three)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500">
            Click a column header to sort. Colors are relative to the fastest result in the same column:{' '}
            <span className="text-emerald-400">≥ 1/3×</span>, <span className="text-yellow-400">≥ 1/10×</span>,{' '}
            <span className="text-orange-400">slower</span>.
          </p>
        </div>
      </div>
    </>
  )
}
