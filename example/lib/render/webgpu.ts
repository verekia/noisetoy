// WebGPU renderer: fullscreen triangle + the WGSL module composed by noisetoy
// for the current effect. The adapter/device are created once and shared
// across renderer instances.

import type { RenderOptions, Renderer } from '#/lib/render/types'

let devicePromise: Promise<GPUDevice> | null = null

export const getGpuDevice = (): Promise<GPUDevice> => {
  if (!devicePromise) {
    devicePromise = (async () => {
      if (!('gpu' in navigator)) throw new Error('WebGPU is not available')
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) throw new Error('No WebGPU adapter found')
      return adapter.requestDevice()
    })()
  }
  return devicePromise
}

export const createWebgpuRenderer = async (
  canvas: HTMLCanvasElement,
  { effect, width: size }: RenderOptions,
): Promise<Renderer> => {
  const device = await getGpuDevice()
  const context = canvas.getContext('webgpu')
  if (!context) throw new Error('Could not get webgpu context')
  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })

  device.pushErrorScope('validation')
  const module = device.createShaderModule({ code: effect.wgsl() })
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  })
  const error = await device.popErrorScope()
  if (error) throw new Error(`WGSL error: ${error.message}`)

  const uniformBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  })
  const uniforms = new Float32Array(4)

  const render = (timeSec: number) => {
    uniforms[0] = size
    uniforms[1] = size
    uniforms[2] = timeSec
    uniforms[3] = 0
    device.queue.writeBuffer(uniformBuffer, 0, uniforms)
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.draw(3)
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  const finish = () => device.queue.onSubmittedWorkDone()

  const dispose = () => {
    // Only this renderer's own resources are released. The canvas context is
    // deliberately left configured: getContext returns one shared object per
    // canvas, so unconfiguring here would break a newer renderer that has
    // already configured the same canvas (React StrictMode's double mount
    // aborts the first renderer *after* the second one is live).
    uniformBuffer.destroy()
  }

  return { render, dispose, finish }
}
