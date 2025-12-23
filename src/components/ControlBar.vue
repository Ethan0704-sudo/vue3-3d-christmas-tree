<template>
  <div class="controls-container">
    <button
      class="btn-magic"
      data-tooltip="上传照片 (Max 50)"
      @click="$emit('upload-photo')"
    >
      <i class="fas fa-camera"></i>
    </button>
    <button
      class="btn-magic"
      data-tooltip="更换背景 (Max 4)"
      @click="$emit('upload-bg')"
    >
      <i class="fas fa-image"></i>
    </button>
    <button
      class="btn-magic"
      :class="{ active: gestureEnabled }"
      @click="$emit('toggle-gesture')"
      data-tooltip="开启/关闭手势"
    >
      <i class="fas fa-hand-sparkles"></i>
    </button>
    <button
      class="btn-magic"
      @click="$emit('show-blessing')"
      data-tooltip="获取节日祝福"
    >
      <i class="fas fa-gift"></i>
    </button>
    <button
      class="btn-magic"
      @click="$emit('reset-view')"
      data-tooltip="重置视角"
    >
      <i class="fas fa-sync"></i>
    </button>

    <div class="divider"></div>

    <button
      class="btn-magic"
      @click="$emit('open-theme')"
      data-tooltip="魔法调色盘"
    >
      <i class="fas fa-palette"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  gestureEnabled: boolean;
}>();

defineEmits<{
  (e: "upload-photo"): void;
  (e: "upload-bg"): void;
  (e: "toggle-gesture"): void;
  (e: "show-blessing"): void;
  (e: "reset-view"): void;
  (e: "open-theme"): void;
}>();
</script>

<style scoped>
.controls-container {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  background: rgba(15, 15, 15, 0.65);
  padding: 12px 25px;
  border-radius: 50px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}
.btn-magic {
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.2);
  color: rgba(255, 255, 255, 0.7);
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  position: relative;
}
.btn-magic:hover,
.btn-magic.active {
  background: #d4af37;
  color: #000;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.6);
  transform: scale(1.1);
}
.btn-magic::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 55px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: #d4af37;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  border: 1px solid #d4af37;
}
.btn-magic:hover::after {
  opacity: 1;
}
.divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 5px;
}
</style>
