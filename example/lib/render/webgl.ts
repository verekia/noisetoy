// WebGL2 renderer: fullscreen triangle + the GLSL fragment shader composed by
// noisetoy for the current effect.

import type { RenderOptions, Renderer } from '#/lib/render/types'

const VERTEX_SRC = `#version 300 es
void main() {
  vec2 pos[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`

const compile = (gl: WebGL2RenderingContext, type: number, src: string): WebGLShader => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not create shader')
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`GLSL compile error: ${log}`)
  }
  return shader
}

export const createWebglRenderer = (canvas: HTMLCanvasElement, { effect, width: size }: RenderOptions): Renderer => {
  const gl = canvas.getContext('webgl2', { antialias: false })
  if (!gl) throw new Error('WebGL2 is not available')

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, effect.glsl())
  const program = gl.createProgram()
  if (!program) throw new Error('Could not create program')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`GLSL link error: ${gl.getProgramInfoLog(program)}`)
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  gl.useProgram(program)

  const uRes = gl.getUniformLocation(program, 'u_res')
  const uT = gl.getUniformLocation(program, 'u_t')
  gl.viewport(0, 0, size, size)
  gl.uniform2f(uRes, size, size)

  const render = (timeSec: number) => {
    gl.uniform1f(uT, timeSec)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const readback = new Uint8Array(4)
  const finish = () => {
    // readPixels forces a true sync with the GPU, unlike gl.finish in some browsers.
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readback)
  }

  const frameBoundary = () => gl.flush()

  const dispose = () => {
    gl.deleteProgram(program)
    // Only release the context for detached canvases (benchmarks): the viewer
    // reuses its canvas across renderer instances, and a lost context would
    // poison every subsequent renderer on it.
    if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { render, dispose, finish, frameBoundary }
}
