<template>
  <div :class="['li-divider', { 'li-divider--vertical': vertical }]" role="separator" :aria-orientation="vertical ? 'vertical' : 'horizontal'">
    <span v-if="$slots.default || label" class="li-divider__label">
      <slot>{{ label }}</slot>
    </span>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  vertical: { type: Boolean, default: false },
})
</script>

<style scoped>
.li-divider {
  display: flex;
  align-items: center;
  width: 100%;
  border: none;
  margin: 16px 0;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Horizontal line */
.li-divider::before,
.li-divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--color-gray-200, #1A1A1A);
}

/* With label — line on both sides */
.li-divider::after {
  display: none;
}

.li-divider:has(.li-divider__label)::before,
.li-divider:has(.li-divider__label)::after {
  display: block;
}

.li-divider__label {
  flex-shrink: 0;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-gray-500, #999999);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* Vertical variant */
.li-divider--vertical {
  flex-direction: column;
  width: auto;
  height: 100%;
  min-height: 24px;
  margin: 0 8px;
}

.li-divider--vertical::before,
.li-divider--vertical::after {
  display: none;
}

.li-divider--vertical::before {
  display: block;
  border-top: none;
  border-left: 1px solid var(--color-gray-200, #1A1A1A);
  height: 100%;
  width: 0;
}

.li-divider--vertical .li-divider__label {
  padding: 8px 0;
}
</style>
