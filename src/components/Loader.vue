<template>
  <div id="loader">
    <div class="spinner"></div>
    <div id="loader-text">{{ loadingText }}</div>
    <button v-if="showEnterBtn" id="enter-btn" @click="$emit('enter')">
      开启圣诞魔法
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loadingText: string;
  showEnterBtn: boolean;
}>();

defineEmits<{
  (e: "enter"): void;
}>();
</script>

<style scoped>
#loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: opacity 1s ease-out;
}
.spinner {
  width: 60px;
  height: 60px;
  border: 2px solid rgba(212, 175, 55, 0.1);
  border-top: 2px solid #d4af37;
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin-bottom: 20px;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
#loader-text {
  font-family: "Cinzel", serif;
  letter-spacing: 4px;
  color: #fff;
  font-size: 14px;
}
#enter-btn {
  background: transparent;
  color: #d4af37;
  border: 1px solid #d4af37;
  padding: 12px 40px;
  font-family: "Cinzel", serif;
  font-size: 18px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.4s;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
  margin-top: 20px;
  border-radius: 4px;
  z-index: 10000;
}
#enter-btn:hover {
  background: #d4af37;
  color: #000;
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.6);
}
</style>
