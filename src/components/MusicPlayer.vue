<template>
  <div id="music-player" @click="toggleMusic">
    <div class="music-info">
      <div
        id="music-marquee"
        :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }"
      >
        Merry Christmas Mr. Lawrence
      </div>
    </div>
    <div class="music-disc" :class="{ playing: isPlaying }">
      <i class="fas fa-music" style="color: #d4af37"></i>
    </div>
    <audio ref="audioRef" loop>
      <source :src="src" type="audio/mp3" />
    </audio>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  src: string;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);

const toggleMusic = () => {
  if (!audioRef.value) return;

  if (isPlaying.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    audioRef.value.play().catch((e) => console.error("Play error", e));
    isPlaying.value = true;
  }
};

const play = () => {
  if (!audioRef.value) return;
  audioRef.value
    .play()
    .then(() => {
      isPlaying.value = true;
    })
    .catch((e) => console.error("Auto-play blocked", e));
};

defineExpose({ play });
</script>

<style scoped>
#music-player {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
  cursor: pointer;
  z-index: 50;
  background: rgba(15, 15, 15, 0.65);
  padding: 8px 16px;
  border-radius: 30px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}
#music-player:hover {
  border-color: #d4af37;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
}
.music-disc {
  width: 24px;
  height: 24px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  animation: rotate 10s linear infinite paused;
}
.music-disc.playing {
  animation-play-state: running;
}
@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}
.music-info {
  font-family: "Cinzel", serif;
  font-size: 12px;
  color: #d4af37;
  width: 120px;
  overflow: hidden;
  white-space: nowrap;
}
#music-marquee {
  display: inline-block;
  padding-left: 100%;
  animation: scroll 10s linear infinite;
}
@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
