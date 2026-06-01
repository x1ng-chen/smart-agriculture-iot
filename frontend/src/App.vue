<template>
  <router-view />
</template>

<style>
/* 全局农业摄影背景 */
body::before {
  content: '';
  position: fixed;
  inset: -20px;
  z-index: -1;
  background:
    url('https://images.unsplash.com/photo-1704162485983-7b5cf81894e1?w=1920&q=85&fm=jpg&crop=entropy&fit=crop')
    center / cover no-repeat;
  filter: brightness(0.55) saturate(1.1);
}
#app {
  width: 100%;
  height: 100vh;
  background: transparent;
  overflow: hidden;
}
</style>
