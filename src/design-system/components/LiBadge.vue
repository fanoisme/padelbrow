<template>
  <span :class="['li-badge', `li-badge-${variant}`, `li-badge-${size}`, { 'li-badge-pill': isPill }]">
    <span v-if="$slots.iconLeft" class="li-badge-icon">
      <slot name="iconLeft"></slot>
    </span>
    <span class="li-badge-label">
      <slot>{{ label }}</slot>
    </span>
    <span v-if="$slots.iconRight" class="li-badge-icon">
      <slot name="iconRight"></slot>
    </span>
  </span>
</template>

<script setup>
defineProps({
  label: String,
  variant: {
    type: String,
    default: 'neutral',
    // neutral, success, info, warning, error, brand
    validator: (v) => ['neutral', 'success', 'info', 'warning', 'error', 'brand'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v)
  },
  isPill: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.li-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  border-radius: var(--radius-md, 8px);
  font-family: var(--font-family, 'Inter', sans-serif);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.li-badge-pill {
  border-radius: var(--radius-pill, 999px);
}

.li-badge-sm {
  padding: 2px 6px;
  font-size: var(--text-tiny, 10px);
}

.li-badge-md {
  padding: 4px 8px;
  font-size: var(--text-xxs, 12px);
}

.li-badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.li-badge-icon :deep(svg) {
  width: 12px;
  height: 12px;
}

/* Variants */
.li-badge-neutral {
  background-color: var(--color-gray-100, #121212);
  color: var(--color-gray-800, #4D4D4D);
  border: 1px solid var(--color-gray-300, #2A2A2A);
}

.li-badge-success {
  background-color: var(--color-success-container, #D7F9E9);
  color: var(--color-on-success-container, #059669);
}

.li-badge-info {
  background-color: var(--color-blue-100, #E6E6FF);
  color: var(--color-blue-500, #0047B2);
}

.li-badge-warning {
  background-color: var(--color-yellow-100, #FFF3D6);
  color: var(--color-orange-500, #FF3000);
}

.li-badge-error {
  background-color: var(--color-error-container, #FDECEE);
  color: var(--color-red-500, #A33129);
}

.li-badge-brand {
  background-color: var(--color-yellow-200, #FFEB3B);
  color: var(--color-gray-900, #FFFFFF);
}
</style>
