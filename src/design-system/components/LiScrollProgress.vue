<template>
  <!-- Top-of-viewport scroll progress bar (Design Guide §1I). -->
  <div class="li-scroll-progress" aria-hidden="true">
    <div class="li-scroll-progress__bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
let raf = 0

function update() {
  raf = 0
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
}

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(update)
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style scoped>
.li-scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: var(--z-cursor, 70);
  pointer-events: none;
}
.li-scroll-progress__bar {
  height: 100%;
  transform-origin: left center;
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  transition: transform 100ms linear;
}
@media (prefers-reduced-motion: reduce) {
  .li-scroll-progress__bar { transition: none; }
}
</style>
