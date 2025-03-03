<template>
  <div id="perlin-map"
       ref="$map"
       class="full-wrap">
    <div v-show="!isSupport"
         class="no-support fs-16">
      对不起，您的浏览器不支持WebGL!
    </div>
  </div>
</template>
<script lang="ts" setup>
import { isSupportWebGL } from '~/utils'
import GUI from 'lil-gui'
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { CustomPrimitive, generateData } from './data/perlin'

const isSupport = isSupportWebGL()
const $map = ref()

const dim_temp = new Cesium.Cartesian3(1, 1, 1)
const geometry = Cesium.BoxGeometry.fromDimensions({
  vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
  dimensions: dim_temp,
})
const primitive_modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(124.21936679679918, 45.85136872098397)
  ),
  new Cesium.Cartesian3(0.0, 0.0, 80.0),
  new Cesium.Matrix4()
)
const customPrimitive = new CustomPrimitive({
  modelMatrix: primitive_modelMatrix,
  geometry: geometry,
  data: generateData(),
  dim: dim_temp,
})

onMounted(() => {
  if (isSupport) {
    initMap()
    initGUI()
  }
})

function initMap () {
  // Cesium.Ion.defaultAccessToken = ''
  const viewer = new Cesium.Viewer('perlin-map', {
    infoBox: false,
    shouldAnimate: true,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    contextOptions: {
      requestWebgl1: false,
      allowTextureFilterAnisotropic: true,
      webgl: {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      },
    },
  })

  const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement

  creditContainer.style.display = 'none'
  viewer.resolutionScale = 1.0
  viewer.scene.msaaSamples = 4
  viewer.postProcessStages.fxaa.enabled = true
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.debugShowFramesPerSecond = true

  initPrimitive(viewer)
}

/**
 * 初始化图元
 */
function initPrimitive (viewer:Cesium.Viewer) {
  viewer.scene.primitives.add(customPrimitive)
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      124.21936679679918,
      45.85136872098397,
      80.0
    ),
    box: {
      dimensions: dim_temp,
      fill: false,
      outline: true,
      outlineColor: Cesium.Color.YELLOW,
    },
  })

  viewer.camera.lookAt(
    Cesium.Cartesian3.fromDegrees(
      124.21936679679918,
      45.85136872098397,
      80
    ),
    new Cesium.Cartesian3(2, 2, 2)
  )
}

/**
 * 初始化GUI组件
 */
function initGUI () {
  const gui = new GUI({
    container: $map.value,
    title: '参数控制器',
  })

  gui.add(customPrimitive.viewModel, 'threshold', 0, 1, 0.01).onChange(updateValue)
  gui.add(customPrimitive.viewModel, 'steps', 0, 300, 1).onChange(updateValue)
}

function updateValue (data:any) {
  console.log('updateValue', data, customPrimitive.viewModel)
}
</script>
<style lang="scss" scoped>
.full-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}
:deep(.lil-gui){
  top: 110px;
  right: 10px;
  position: absolute;
  --font-size: 14px;
  --text-color: #333;
  --title-text-color: #333;
  --title-background-color: #eee;
  --background-color: #fff;
	--widget-color: #c7c7c7;
}
</style>