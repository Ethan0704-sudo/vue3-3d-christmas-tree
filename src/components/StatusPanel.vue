<template>
  <div class="status-panel">
    <div class="status-header">
      <div class="status-indicator" :class="{ active: gestureEnabled }"></div>
      <span>{{ gestureEnabled ? "手势已激活" : "手势控制已关闭" }}</span>
    </div>
    <ul class="guide-list">
      <li><i class="fas fa-hand-paper"></i> 挥手 - 旋转场景</li>
      <li><i class="fas fa-hand-rock"></i> 握拳 - 圣诞树聚拢</li>
      <li><i class="fas fa-hand-sparkles"></i> 张开 - 散开成画廊</li>
      <li><i class="far fa-hand-point-up"></i> 捏合 - 聚焦查看照片</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  gestureEnabled: boolean;
}>();
</script>

<style scoped>
.status-panel {
  position: absolute;
  top: 30px;
  left: 30px;
  width: 220px;
  padding: 15px;
  background: rgba(15, 15, 15, 0.65);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 3px solid #d4af37;
  border-radius: 12px;
  pointer-events: auto;
}
.status-header {
  display: flex;
  align-items: center;
  color: #d4af37;
  font-weight: 700;
  margin-bottom: 8px;
}
.status-indicator {
  width: 8px;
  height: 8px;
  background: #555;
  border-radius: 50%;
  margin-right: 10px;
  transition: 0.3s;
}
.status-indicator.active {
  background: #00ff00;
  box-shadow: 0 0 10px #00ff00;
}
.guide-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}
.guide-list i {
  width: 20px;
  color: #d4af37;
  margin-right: 5px;
  text-align: center;
}
</style>
