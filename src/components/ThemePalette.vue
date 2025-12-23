<template>
  <div class="overlay" :class="{ active: isOpen }">
    <div class="overlay-card" style="width: 600px">
      <button class="overlay-close" @click="$emit('close')">&times;</button>
      <div class="overlay-title">魔法调色盘</div>
      <div class="theme-grid">
        <div
          class="theme-card"
          :class="{ active: currentTheme === 'classic' }"
          @click="selectTheme('classic')"
        >
          <div
            class="theme-color-dot"
            style="background: linear-gradient(135deg, #052b10, #722f37)"
          ></div>
          <div class="theme-name">经典圣诞红绿</div>
        </div>
        <div
          class="theme-card"
          :class="{ active: currentTheme === 'frozen' }"
          @click="selectTheme('frozen')"
        >
          <div
            class="theme-color-dot"
            style="background: linear-gradient(135deg, #e0f7fa, #006064)"
          ></div>
          <div class="theme-name">极地冰雪银蓝</div>
        </div>
        <div
          class="theme-card"
          :class="{ active: currentTheme === 'midnight' }"
          @click="selectTheme('midnight')"
        >
          <div
            class="theme-color-dot"
            style="background: linear-gradient(135deg, #000, #d4af37)"
          ></div>
          <div class="theme-name">午夜黑金奢华</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ThemeKey } from "../types";

defineProps<{
  isOpen: boolean;
  currentTheme: ThemeKey;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select-theme", theme: ThemeKey): void;
}>();

const selectTheme = (theme: ThemeKey) => {
  emit("select-theme", theme);
};
</script>

<style scoped>
/* Reuse Overlay Styles */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.overlay.active {
  opacity: 1;
  pointer-events: auto;
}
.overlay-card {
  background: rgba(15, 15, 15, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  transform: translateY(30px);
  transition: transform 0.4s ease;
}
.overlay.active .overlay-card {
  transform: translateY(0);
}
.overlay-title {
  font-family: "Cinzel", serif;
  font-size: 32px;
  color: #d4af37;
  margin-bottom: 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 15px;
}
.overlay-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  cursor: pointer;
  transition: 0.3s;
}
.overlay-close:hover {
  color: #d4af37;
  transform: rotate(90deg);
}

/* Grid Styles */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px 0;
}
.theme-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: 0.3s;
  text-align: center;
}
.theme-card:hover,
.theme-card.active {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
}
.theme-color-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 auto 10px;
}
.theme-name {
  font-family: "Cinzel", serif;
  color: #fff;
  font-size: 14px;
}
</style>
