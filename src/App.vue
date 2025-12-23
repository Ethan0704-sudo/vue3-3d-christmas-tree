<script setup lang="ts">
import ChristmasTree from "./views/ChristmasTree.vue";
</script>

<template>
  <main>
    <ChristmasTree />
  </main>
</template>

<style>
:root {
  --bg-color: #050505;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: var(--bg-color);
  width: 100vw;
  height: 100vh;
  font-family: "Playfair Display", "Noto Serif SC", serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100%;
}
</style>
