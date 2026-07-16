<template>
  <component :is="resolvedTag" :class="['li-dropdown-item', { 'li-dropdown-item--divider': divider, 'li-dropdown-item--danger': variant === 'danger', 'li-dropdown-item--header': header }]" role="menuitem" :tabindex="divider || header ? -1 : 0" @click="handleClick" @keydown.enter="handleClick">
    <template v-if="divider">
      <div class="li-dropdown-item__divider" role="separator" />
    </template>
    <template v-else-if="header">
      <span class="li-dropdown-item__header">{{ label }}</span>
    </template>
    <template v-else>
      <LiIcon v-if="icon" :name="icon" size="sm" class="li-dropdown-item__icon" />
      <span v-if="label" class="li-dropdown-item__label">{{ label }}</span>
      <span v-if="shortcut" class="li-dropdown-item__shortcut">{{ shortcut }}</span>
    </template>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: { type: String, default: 'default', validator: v => ['default', 'danger'].includes(v) },
  divider: { type: Boolean, default: false },
  header: { type: Boolean, default: false },
  shortcut: { type: String, default: '' },
  tag: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const resolvedTag = computed(() => {
  if (props.divider || props.header) return 'div'
  return props.tag
})

function handleClick() {
  if (!props.divider && !props.header && !props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
.li-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-900, #FFFFFF);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.li-dropdown-item:hover:not(.li-dropdown-item--divider):not(.li-dropdown-item--header) {
  background: var(--color-gray-100, #121212);
}

.li-dropdown-item:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

.li-dropdown-item--danger { color: var(--color-red-400, #C83E3B); }
.li-dropdown-item--danger:hover { background: var(--color-error-container, #FDECEE); }

.li-dropdown-item--divider {
  padding: 4px 12px;
  cursor: default;
}

.li-dropdown-item__divider {
  width: 100%;
  height: 1px;
  background: var(--color-gray-200, #1A1A1A);
}

.li-dropdown-item--header {
  padding: 6px 12px;
  cursor: default;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-gray-500, #999999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.li-dropdown-item__icon { flex-shrink: 0; color: var(--color-gray-600, #808080); }
.li-dropdown-item--danger .li-dropdown-item__icon { color: var(--color-red-400, #C83E3B); }

.li-dropdown-item__label { flex: 1; }
.li-dropdown-item__shortcut { font-size: 11px; color: var(--color-gray-500, #999999); }
</style>
