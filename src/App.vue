<template>
  <el-config-provider namespace="ep">
    <BaseHeader />
    <div class="main-container">
      <RouterView />
      <!-- <BaseSide />
      <div w="full">
        <RouterView />
      </div> -->
    </div>
  </el-config-provider>
</template>

<style>
#app {
  text-align: center;
  color: var(--ep-text-color-primary);
}

.main-container {
  position: relative;
  height: calc(100vh - var(--ep-menu-item-height) - 4px);
}
</style>
