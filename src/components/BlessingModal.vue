<template>
  <div class="overlay" :class="{ active: isOpen }">
    <div
      class="overlay-card"
      style="width: 350px; padding: 40px; text-align: center"
    >
      <button class="overlay-close" @click="$emit('close')">&times;</button>
      <i
        class="fas fa-quote-left"
        style="
          color: #d4af37;
          font-size: 20px;
          display: block;
          margin-bottom: 20px;
        "
      ></i>
      <div class="modal-text">{{ text }}</div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  text: string;
}>();

defineEmits<{
  (e: "close"): void;
}>();
</script>

<style scoped>
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
.modal-text {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  line-height: 1.6;
  color: #fff;
  margin: 20px 0;
  font-style: italic;
}
.close-btn {
  background: transparent;
  border: 1px solid #d4af37;
  padding: 5px 20px;
  color: #d4af37;
  border-radius: 20px;
  margin-top: 20px;
  cursor: pointer;
  transition: 0.3s;
}
.close-btn:hover {
  background: #d4af37;
  color: #000;
}
</style>
