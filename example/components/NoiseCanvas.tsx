import { useEffect, useRef, useState } from 'react'

import { createJsRenderer } from '#/lib/render/js'
import { createThreeRenderer } from '#/lib/render/three'
import { createWebglRenderer } from '#/lib/render/webgl'
import { createWebgpuRenderer } from '#/lib/render/webgpu'

import type { Renderer } from '#/lib/render/types'
import type { Backend, Effect, ViewMode } from 'noisetoy'

/** Square resolution used by the flat views, which never fill the viewport. */
export const RENDER_SIZE = 512

/** Backing-store scale for the fill views; 2 keeps text-free relief crisp without wasting fill rate. */
const MAX_PIXEL_RATIO = 2

const NoiseCanvas = ({
  effect,
  backend,
  view = '2d',
  displacementScale = 1,
}: {
  /** Must be referentially stable between renders (memoized). */
  effect: Effect
  backend: Backend
  view?: ViewMode
  /** Scales the 3D views' relief height; see RenderOptions. */
  displacementScale?: number
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The 3D views fill their container; the flat views stay a fixed square.
  const fill = view !== '2d'

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    let raf = 0
    let disposed = false
    setError(null)

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    const measure = (): { width: number; height: number } => {
      if (!fill) return { width: RENDER_SIZE, height: RENDER_SIZE }
      const r = wrapper.getBoundingClientRect()
      return {
        width: Math.max(1, Math.round(r.width * pixelRatio)),
        height: Math.max(1, Math.round(r.height * pixelRatio)),
      }
    }

    const initial = measure()
    canvas.width = initial.width
    canvas.height = initial.height

    const options = { effect, width: initial.width, height: initial.height, view, displacementScale }
    const start = async () => {
      const created =
        backend === 'js'
          ? createJsRenderer(canvas, options)
          : backend === 'webgl'
            ? createWebglRenderer(canvas, options)
            : backend === 'three'
              ? await createThreeRenderer(canvas, options)
              : await createWebgpuRenderer(canvas, options)
      if (disposed) {
        created.dispose()
        return
      }
      rendererRef.current = created
      const t0 = performance.now()
      const loop = () => {
        if (disposed) return
        created.render((performance.now() - t0) / 1000)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    start().catch((e: unknown) => {
      if (!disposed) setError(e instanceof Error ? e.message : String(e))
    })

    // Only the fill views change size; resizing goes through the renderer so
    // the pipeline survives a drag instead of being rebuilt each frame.
    let observer: ResizeObserver | null = null
    if (fill) {
      observer = new ResizeObserver(() => {
        const { width, height } = measure()
        if (canvas.width === width && canvas.height === height) return
        canvas.width = width
        canvas.height = height
        rendererRef.current?.resize?.(width, height)
      })
      observer.observe(wrapper)
    }

    return () => {
      disposed = true
      observer?.disconnect()
      cancelAnimationFrame(raf)
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [effect, backend, view, fill, displacementScale])

  return (
    <div
      ref={wrapperRef}
      className={fill ? 'relative size-full' : 'relative aspect-square w-full max-w-[min(100%,calc(100vh-3rem))]'}
    >
      <canvas
        key={`${backend}-${view}`}
        ref={canvasRef}
        className={`size-full bg-black ${fill ? '' : 'rounded-lg border border-zinc-800'}`}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-6">
          <p className="max-w-full text-sm break-words whitespace-pre-wrap text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

export default NoiseCanvas
