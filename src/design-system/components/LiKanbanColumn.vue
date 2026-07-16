<template>
  <div class="li-kanban-column">
    <div class="li-kanban-column__header">
      <span class="li-kanban-column__dot" :style="{ background: dotColor }" />
      <span class="li-kanban-column__title">{{ title }}</span>
      <LiBadge variant="neutral" size="sm">{{ count }}</LiBadge>
    </div>
    <div class="li-kanban-column__body" :class="{ 'li-kanban-column__body--dragover': dragover }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import LiBadge from './LiBadge.vue'

defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
  dotColor: { type: String, default: 'var(--color-gray-400, #B3B3B3)' },
  dragover: { type: Boolean, default: false },
})
</script>

<style>
.li-kanban-column {
  display: flex;
  flex-direction: column;
  background: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-outline-variant, #1A1A1A);
  border-radius: var(--radius-lg, 16px);
  min-height: 300px;
}

.li-kanban-column__header {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
  padding: var(--space-m, 12px) var(--space-l, 16px);
  border-bottom: 1px solid var(--color-outline-variant, #1A1A1A);
}

.li-kanban-column__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.li-kanban-column__title {
  font-family: var(--font-display, 'Inter', system-ui, sans-serif);
  font-size: var(--text-sm, 16px);
  font-weight: 600;
  color: var(--color-gray-900, #FFFFFF);
  flex: 1 1 auto;
  min-width: 0;
}

.li-kanban-column__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
  padding: var(--space-m, 12px);
  flex: 1 1 auto;
  min-height: 120px;
  transition: background-color 150ms ease;
}

.li-kanban-column__body--dragover {
  background: rgba(37, 99, 235, 0.06);
  border: 1px dashed var(--color-blue-300, #3B82F6);
}
</style>
