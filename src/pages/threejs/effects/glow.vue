<script lang="ts" setup>
import * as THREE from 'three'
import { EffectComposer, OrbitControls, OutlinePass, RenderPass } from 'three/examples/jsm/Addons.js'

function init() {
  const container = document.getElementById('three-map')
  if (!container) {
    return
  }
  const { width, height } = container.getBoundingClientRect()
  const clock = new THREE.Clock()
  // 创建一个场景
  const scene = new THREE.Scene()
  // 创建一个相机 视点
  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
  // 设置相机的位置
  camera.position.set(100, 100, 0)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  // 创建一个渲染器
  const renderer = new THREE.WebGLRenderer()
  // 设置渲染器尺寸
  renderer.setSize(width, height)
  // 创建一个控制器
  const controls = new OrbitControls(camera, renderer.domElement)

  container.appendChild(renderer.domElement)

  // 添加灯光
  const spotLight = new THREE.SpotLight(0xFFFFFF)
  spotLight.position.set(2000, 8000, 4000)
  scene.add(spotLight)

  const g1 = new THREE.BoxGeometry(18, 18, 18)
  const g2 = new THREE.BoxGeometry(18, 18, 18)
  const m1 = new THREE.MeshBasicMaterial({
    color: 0x00FF00,
  })
  const m2 = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
  })

  const c1 = new THREE.Mesh(g1, m1)
  const c2 = new THREE.Mesh(g2, m2)
  c1.position.y = 20
  c2.position.y = -20

  scene.add(c1)
  scene.add(c2)
  console.log(scene)

  // 辉光效果
  // 创建了一个渲染通道，这个通道会渲染场景，不会渲染到屏幕上
  const renderScene = new RenderPass(scene, camera)

  // 分辨率 场景 相机 当前选中的物体，（需要添加辉光效果）
  const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera, [c2, c1])
  outlinePass.renderToScreen = true // 渲染到屏幕上
  outlinePass.edgeStrength = 3 // 尺寸
  outlinePass.edgeGlow = 2 // 发光的强度
  outlinePass.edgeThickness = 2 // 光晕粗细
  outlinePass.pulsePeriod = 1// 闪烁的速度
  outlinePass.visibleEdgeColor.set('yellow')

  // 创建一个组合器对象，添加处理通道
  const bloom = new EffectComposer(renderer)
  bloom.setSize(width, height)
  bloom.addPass(renderScene)
  bloom.addPass(outlinePass)

  const animation = () => {
    controls.update(clock.getDelta())
    // 渲染
    renderer.render(scene, camera)
    bloom.render()
    requestAnimationFrame(animation)
  }
  animation()
}

onMounted(() => {
  init()
})
</script>

<template>
  <div id="three-map" />
</template>

<route lang="yaml">
meta:
  title: 辉光
</route>

<style lang="scss" scoped>
#three-map {
  width: 100%;
  height: 100%;
}
</style>
