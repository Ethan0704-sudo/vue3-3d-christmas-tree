<template>
  <div class="title-container">
    <h1>
      <i class="fas fa-snowflake title-icon"></i>
      Merry Christmas
      <i class="fas fa-snowflake title-icon" style="animation-delay: 1.5s"></i>
    </h1>
    <div class="subtitle">祝大家圣诞快乐</div>
  </div>
</template>

<script setup lang="ts">
// 无逻辑，纯展示
</script>

<style scoped>
.title-container {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
}
h1 {
  font-family: "Cinzel", serif;
  font-size: 4vw;
  margin: 0;
  background: linear-gradient(to bottom, #fff 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(212, 175, 55, 0.6);
  letter-spacing: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  white-space: nowrap;
}
.title-icon {
  font-size: 0.6em;
  color: #fff;
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
  text-shadow: 0 0 10px #fff;
  -webkit-text-fill-color: initial;
}
.subtitle {
  font-family: "Noto Serif SC", serif;
  font-size: 1.2vw;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10px;
  letter-spacing: 8px;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  font-weight: 300;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
