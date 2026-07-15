<template>
  <div class="li-glass-panel" :class="{ 'li-glass-panel--accent': accent, 'li-textured': textured }">
    <div v-if="accent" class="li-glass-panel__gradient" />
    <div class="li-glass-panel__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  accent: { type: Boolean, default: false },
  textured: { type: Boolean, default: true },
})
</script>

<style scoped>
.li-glass-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg, 16px);
  background: var(--color-topnav-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-topnav-border, rgba(255, 255, 255, 0.6));
  box-shadow: var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.08));
}

.li-glass-panel__gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-yellow-400, #F9C700), var(--color-orange-400, #FF6B00));
  z-index: 1;
}

.li-glass-panel__content {
  position: relative;
  z-index: 2;
}

@media (prefers-reduced-motion: reduce) {
  .li-glass-panel {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
