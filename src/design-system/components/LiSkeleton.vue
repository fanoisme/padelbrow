<template>
  <div
    :class="['li-skeleton', { 'li-skeleton--circle': circle, 'li-skeleton--text': variant === 'text' }]"
    :style="{ width: width || undefined, height: height || undefined }"
    aria-hidden="true"
  />
</template>

<script setup>
defineProps({
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  circle: { type: Boolean, default: false },
  variant: { type: String, default: 'rect', validator: v => ['rect', 'text', 'circle'].includes(v) },
})
</script>

<style scoped>
.li-skeleton {
  background: var(--color-gray-200, #E6E6E6);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.li-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  animation: li-shimmer 1.5s ease-in-out infinite;
}

.li-skeleton--circle {
  border-radius: 50%;
}

.li-skeleton--text {
  height: 14px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.li-skeleton--text:last-child {
  width: 60%;
}

@keyframes li-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
