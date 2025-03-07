<script lang="ts" setup>
import { Setting } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
// import { routes } from '~/main'
import { cesiumMenu, threeMenu } from './menu'

const active = ref('')
const route = useRoute()

// const subRoutes = computed(() => {
//   const matchedRoute = route.matched[0]
//   if (!matchedRoute?.children)
//     return []

//   return matchedRoute.children.filter((child) => {
//     // 过滤掉动态路由和隐藏路由
//     return child.path && !child.path.includes(':') && child.meta?.showInMenu !== false
//   })
// })
// console.log('routes', routes, route, subRoutes.value)

const menus = computed(() => {
  if (route.path.startsWith('/cesium')) {
    return cesiumMenu
  }
  else if (route.path.startsWith('/three')) {
    return threeMenu
  }
  return []
})

// const isCollapse = ref(true)
function handleOpen(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function handleClose(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}

onMounted(() => {
  console.log('mounted')
})
</script>

<template>
  <el-menu
    router
    :default-active="active"
    class="el-menu-vertical-demo"
    @open="handleOpen"
    @close="handleClose"
  >
    <el-sub-menu
      v-for="item in menus"
      :key="item.id"
      :index="item.id"
    >
      <template #title>
        <el-icon>
          <Setting />
        </el-icon>
        <span>{{ item.name }}</span>
      </template>
      <template v-if="item.children">
        <el-menu-item
          v-for="sub in item.children"
          :key="sub.path"
          :index="sub.path"
        >
          {{ sub.name }}
        </el-menu-item>
      </template>
    </el-sub-menu>
  </el-menu>
</template>
