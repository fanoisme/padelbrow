<template>
  <span
    :class="['li-spinner', `li-spinner--${size}`, { 'li-spinner--inline': inline }]"
    :style="{ color: colorMap[variant] || 'inherit', borderTopColor: colorMap[variant] || 'currentColor' }"
    role="status"
    :aria-label="label || 'Loading'"
  >
    <span class="li-spinner__arc" />
    <span v-if="label" class="li-spinner__label">{{ label }}</span>
  </span>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md', validator: v => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v) },
  variant: { type: String, default: 'brand', validator: v => ['brand', 'neutral', 'inverse'].includes(v) },
  inline: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

const colorMap = {
  brand: 'var(--color-brand, #FFAF03)',
  neutral: 'var(--color-gray-500, #999999)',
  inverse: 'var(--color-gray-0, #FFFFFF)',
}
</script>

<style scoped>
.li-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', system-ui, sans-serif;
}

.li-spinner--inline {
  flex-direction: row;
  gap: 8px;
}

.li-spinner__arc {
  display: block;
  border-radius: 50%;
  border: 2.5px solid var(--color-gray-200, #E6E6E6);
  border-top-color: var(--color-brand, #FFAF03);
  animation: li-spin 0.7s linear infinite;
}

.li-spinner--xs .li-spinner__arc { width: 12px; height: 12px; border-width: 2px; }
.li-spinner--sm .li-spinner__arc { width: 16px; height: 16px; border-width: 2px; }
.li-spinner--md .li-spinner__arc { width: 24px; height: 24px; border-width: 2.5px; }
.li-spinner--lg .li-spinner__arc { width: 32px; height: 32px; border-width: 3px; }
.li-spinner--xl .li-spinner__arc { width: 48px; height: 48px; border-width: 4px; }

.li-spinner__label {
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-gray-600, #808080);
}

@keyframes li-spin {
  to { transform: rotate(360deg); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .li-spinner__arc {
    animation-duration: 2s;
  }
}
</style>
