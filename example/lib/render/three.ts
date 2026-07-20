// Three.js renderer: builds TSL nodes with noisetoy/three and renders them
// with WebGPURenderer. WebGPU only — no WebGL fallback (forceWebGL is never
// set; init fails without WebGPU).
//
// Three presentations:
//   '2d'     — the effect painted on a fullscreen quad.
//   'plane'  — a heavily subdivided plane displaced by the effect and shaded
//              with a fixed light using noisetoy's normal node (3 extra
//              evaluations per pixel). Like the sphere it reads the solid
//              field, so both 3D views show slices of the same volume — except
//              when tiling, which needs the wrapped uv paths.
//   'sphere' — a subdivided sphere displaced along its normals. The effect is
//              built with noisetoy's 'position' domain, so it is sampled in 3D
//              space rather than through the sphere's uv: no wrap seam and no
//              pole pinching.
//
// The 3D modes orbit with OrbitControls and fill whatever canvas they are given.
//
// three modules are imported dynamically so the main bundle stays lean.

import type { RenderOptions, Renderer } from '#/lib/render/types'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const SPHERE_SEGMENTS = 320

const FOV = 40

/**
 * Camera distance that fits a bounding sphere of `radius` in both axes, with
 * headroom. Derived from the aspect so a short viewport (a laptop screen with
 * a full-bleed canvas) frames the object as comfortably as a tall one.
 */
const fitDistance = (radius: number, aspect: number, margin: number): number => {
  const vHalf = Math.tan(((FOV / 2) * Math.PI) / 180)
  const hHalf = vHalf * aspect
  return (radius * margin) / Math.min(vHalf, hHalf)
}

export const createThreeRenderer = async (
  canvas: HTMLCanvasElement,
  { effect, width, height, view = '2d' }: RenderOptions,
): Promise<Renderer> => {
  if (!('gpu' in navigator)) throw new Error('The Three.js backend requires WebGPU')
  const THREE = await import('three/webgpu')
  const TSL = await import('three/tsl')
  const { effectNode, effectNormalNode, DISPLACEMENT, PLANE_SEGMENTS } = await import('noisetoy/three')

  const is3d = view !== '2d'
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: is3d })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setSize(width, height, false)
  await renderer.init()

  const timeUniform = TSL.uniform(0)
  const scene = new THREE.Scene()
  const material = new THREE.MeshBasicNodeMaterial()
  // Both meshes span 2 world units, while the uv domain maps that span to
  // 0..1, so solid sampling halves local positions. That makes `scale` mean
  // the same number of lattice cells across the object in every view —
  // without it the sphere carries twice the spatial frequency of the plane.
  const SOLID_UNIT = 0.5
  // The plane flattens its local xy into the field; the sphere keeps its own
  // surface point, which is what keeps the field uniform all the way around.
  const planePosition = TSL.vec3(TSL.positionLocal.x.mul(SOLID_UNIT), TSL.positionLocal.y.mul(SOLID_UNIT), 0)
  const spherePosition = TSL.positionLocal.mul(SOLID_UNIT)
  const solid = effect.domain === 'position'
  const samplePosition = view === 'plane' ? planePosition : view === 'sphere' ? spherePosition : undefined
  const height01 = effectNode(effect, { time: timeUniform, position: solid ? samplePosition : undefined })

  let camera: InstanceType<typeof THREE.OrthographicCamera> | InstanceType<typeof THREE.PerspectiveCamera>
  let geometry: InstanceType<typeof THREE.PlaneGeometry> | InstanceType<typeof THREE.SphereGeometry>
  let controls: OrbitControls | null = null

  if (view === 'plane') {
    material.positionNode = TSL.positionLocal.add(TSL.vec3(0, 0, height01.mul(DISPLACEMENT)))

    const n = effectNormalNode(effect, {
      time: timeUniform,
      epsilon: 1 / PLANE_SEGMENTS,
      position: solid ? planePosition : undefined,
    })
    // Fixed light in plane-local space (+Z is the displacement axis).
    const light = TSL.normalize(TSL.vec3(-0.4, -0.45, 0.8))
    const lambert = TSL.max(TSL.dot(n, light), 0)
    material.colorNode = TSL.vec3(height01.mul(0.6).add(0.25).mul(lambert.mul(0.8).add(0.35)).clamp(0, 1))

    geometry = new THREE.PlaneGeometry(2, 2, PLANE_SEGMENTS, PLANE_SEGMENTS)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2 // lay the plane flat; local +Z becomes world up
    scene.add(mesh)

    camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 40)
    // Half-extents of the displaced plane: 1 x 1 across, DISPLACEMENT tall.
    // A tilted plane projects far smaller than its bounding sphere, so it
    // takes a sub-1 margin to frame as tightly as the sphere does.
    const dist = fitDistance(Math.hypot(1, 1, DISPLACEMENT), width / height, 0.68)
    camera.position.set(0, dist * 0.42, dist * 0.91)
  } else if (view === 'sphere') {
    // height01 already samples in 3D via the effect's 'position' domain, so
    // the field wraps the sphere with no seam and no pole pinching.
    // Same world-space amplitude as the plane: both meshes are 2 units across
    // and now share feature widths, so sharing DISPLACEMENT gives them the
    // same relief steepness.
    material.positionNode = TSL.positionLocal.add(TSL.normalLocal.mul(height01.mul(DISPLACEMENT)))
    // The geometric normal keeps the sphere reading as a sphere; the height
    // drives albedo, and the displaced silhouette supplies the relief.
    const light = TSL.normalize(TSL.vec3(-0.45, 0.35, 0.8))
    const lambert = TSL.max(TSL.dot(TSL.normalLocal, light), 0)
    material.colorNode = TSL.vec3(height01.mul(0.65).add(0.2).mul(lambert.mul(0.85).add(0.25)).clamp(0, 1))

    geometry = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS / 2)
    scene.add(new THREE.Mesh(geometry, material))

    camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 40)
    // Displacement pushes the surface past the unit radius.
    const dist = fitDistance(1 + DISPLACEMENT, width / height, 1.12)
    camera.position.set(0, dist * 0.24, dist * 0.97)
  } else {
    material.colorNode = TSL.vec3(height01)
    geometry = new THREE.PlaneGeometry(2, 2)
    scene.add(new THREE.Mesh(geometry, material))
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
  }

  if (is3d) {
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.minDistance = 0.6
    controls.maxDistance = 20
    // On the plane, stop just short of the horizon so it never flips inside out.
    if (view === 'plane') controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.target.set(0, 0, 0)
    controls.update()
  }

  const render = (timeSec: number) => {
    timeUniform.value = timeSec
    controls?.update() // damping needs a per-frame update
    renderer.render(scene, camera)
  }

  const resize = (w: number, h: number) => {
    renderer.setSize(w, h, false)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
  }

  const finish = async () => {
    const device = (renderer.backend as { device?: GPUDevice }).device
    if (device) await device.queue.onSubmittedWorkDone()
  }

  const dispose = () => {
    controls?.dispose() // detaches the canvas pointer listeners
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }

  return { render, dispose, resize, finish }
}
