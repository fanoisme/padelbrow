<template>
  <span
    :class="['li-chip', `li-chip--${variant}`, `li-chip--${size}`, { 'li-chip--pill': pill, 'li-chip--clickable': clickable }]"
    :tabindex="clickable ? 0 : undefined"
    :role="clickable ? 'button' : undefined"
    @keydown.enter="clickable && $emit('click')"
    @keydown.space.prevent="clickable && $emit('click')"
    @click="clickable && $emit('click')"
  >
    <LiIcon v-if="iconLeft" :name="iconLeft" size="xxs" />
    <span class="li-chip__label"><slot /></span>
    <LiIcon v-if="removable" name="close" size="xxs" class="li-chip__remove" @click.stop="$emit('remove')" />
    <LiIcon v-else-if="iconRight" :name="iconRight" size="xxs" />
  </span>
</template>

<script setup>
import LiIcon from './LiIcon.vue'

defineProps({
  variant: { type: String, default: 'neutral', validator: v => ['neutral', 'brand', 'success', 'warning', 'error', 'info'].includes(v) },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  pill: { type: Boolean, default: true },
  clickable: { type: Boolean, default: false },
  removable: { type: Boolean, default: false },
  iconLeft: { type: String, default: '' },
  iconRight: { type: String, default: '' },
})

defineEmits(['click', 'remove'])
</script>

<style scoped>
.li-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  user-select: none;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-chip--sm  { padding: 2px 8px;  font-size: 10px; border-radius: 4px; }
.li-chip--md  { padding: 4px 12px; font-size: 12px; border-radius: 6px; }
.li-chip--pill { border-radius: 999px; }

.li-chip--clickable {
  cursor: pointer;
}

.li-chip--clickable:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

/* Variants */
.li-chip--neutral { background: var(--color-gray-100, #121212); color: var(--color-gray-700, #B3B3B3); }
.li-chip--neutral.li-chip--clickable:hover { background: var(--color-gray-200, #1A1A1A); }

.li-chip--brand { background: var(--color-yellow-100, #FFF3D6); color: #8B5E00; }
.li-chip--brand.li-chip--clickable:hover { background: var(--color-yellow-200, #FFEB3B); }

.li-chip--success { background: var(--color-success-container, #D7F9E9); color: var(--color-green-400, #10B981); }
.li-chip--success.li-chip--clickable:hover { background: var(--color-green-200, #6EE7B7); }

.li-chip--warning { background: var(--color-orange-100, #FFB700); color: var(--color-orange-400, #FF6B00); }
.li-chip--warning.li-chip--clickable:hover { background: var(--color-orange-200, #FFA726); }

.li-chip--error { background: var(--color-error-container, #FDECEE); color: var(--color-red-400, #C83E3B); }
.li-chip--error.li-chip--clickable:hover { background: var(--color-red-200, #E57373); }

.li-chip--info { background: var(--color-blue-100, #E6E6FF); color: var(--color-blue-400, #2563EB); }
.li-chip--info.li-chip--clickable:hover { background: var(--color-blue-200, #60A5FA); }

.li-chip__remove {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.li-chip__remove:hover { opacity: 1; }
</style>
