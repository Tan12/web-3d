<template>
  <div class="content flex">
    <BaseSide />
    <div w="full">
      <RouterView />
    </div>
  </div>
</template>

<style type="scss" scoped>
.content {
  width: 100%;
  height: 100%;
}
</style>
