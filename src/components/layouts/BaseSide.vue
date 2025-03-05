<script lang="ts" setup>
import { Setting } from '@element-plus/icons-vue'

// const isCollapse = ref(true)
function handleOpen(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function handleClose(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
</script>

<template>
  <el-menu
    router
    default-active="1"
    class="el-menu-vertical-demo"
    @open="handleOpen"
    @close="handleClose"
  >
    <el-sub-menu index="1">
      <template #title>
        <el-icon>
          <Setting />
        </el-icon>
        <span>体渲染</span>
      </template>
      <el-menu-item index="/cesium/volume-rendering/cloud">
        体积云
      </el-menu-item>
      <el-menu-item index="/cesium/volume-rendering/perlin">
        柏林噪声
      </el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>
