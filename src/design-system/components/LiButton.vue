<template>
  <button
    :class="['li-btn', `li-btn-${variant}`, `li-btn-${size}`, { 'li-btn-icon-only': isIconOnly, 'li-btn-loading': loading }]"
    :disabled="disabled || loading"
    @click="handleClick"
    ref="btn"
  >
    <span v-if="loading" class="li-btn-spinner"></span>
    <span v-if="iconLeft && !loading" class="li-btn-icon li-btn-icon-left">
      <slot name="iconLeft"><component :is="iconLeft" /></slot>
    </span>
    <span class="li-btn-label" :class="{ 'sr-only': isIconOnly }">
      <slot></slot>
    </span>
    <span v-if="iconRight && !loading" class="li-btn-icon li-btn-icon-right">
      <slot name="iconRight"><component :is="iconRight" /></slot>
    </span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRipple } from '../composables/useRipple';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  iconLeft: [Object, String],
  iconRight: [Object, String],
  isIconOnly: Boolean,
  disabled: Boolean,
  loading: Boolean,
});

const emit = defineEmits(['click']);
const btn = ref(null);
const { addRipple } = useRipple();

const handleClick = (e) => {
  if (props.disabled || props.loading) return;
  addRipple(e, btn.value);
  emit('click', e);
};
</script>

<style scoped>
.li-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-s, 8px);
  border: none;
  cursor: pointer;
  border-radius: var(--radius-pill, 999px);
  font-family: var(--font-family, 'Inter', sans-serif);
  font-weight: 600;
  transition: all 0.3s var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
  overflow: hidden;
  user-select: none;
  outline: none;
  letter-spacing: 0.01em;
}

.li-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 188, 37, 0.3);
}

.li-btn:active {
  transform: scale(0.97);
}

.li-btn:disabled, .li-btn-loading {
  cursor: not-allowed;
  transform: none;
}

/* Sizes */
.li-btn-sm {
  padding: 8px 18px;
  font-size: var(--text-xs, 14px);
  height: 36px;
}

.li-btn-md {
  padding: 10px 24px;
  font-size: var(--text-sm, 15px);
  height: 44px;
}

.li-btn-lg {
  padding: 14px 32px;
  font-size: var(--text-sm, 16px);
  height: 52px;
}

.li-btn-icon-only {
  padding: 0;
  width: auto;
  aspect-ratio: 1/1;
}

/* Variants */
.li-btn-primary {
  background: linear-gradient(135deg, var(--cta-primary-bg, #FFBC25) 0%, var(--cta-primary-hover, #FAB000) 100%);
  color: var(--cta-primary-text, #1E1E1E);
  box-shadow: 0 4px 16px rgba(255, 188, 37, 0.25);
}

.li-btn-primary:hover:not(:disabled) {
  box-shadow: 0 8px 24px rgba(255, 188, 37, 0.35);
  transform: translateY(-2px);
}

.li-btn-secondary {
  background: rgba(0, 0, 0, 0.03);
  color: var(--cta-secondary-text, #333333);
  border: none;
  backdrop-filter: blur(8px);
}

.li-btn-secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}

.li-btn-danger {
  background: linear-gradient(135deg, var(--cta-danger-bg, #C83E3B) 0%, var(--color-red-500, #A33129) 100%);
  color: var(--cta-danger-text, #FFFFFF);
  box-shadow: 0 4px 16px rgba(200, 62, 59, 0.25);
}

.li-btn-danger:hover:not(:disabled) {
  box-shadow: 0 8px 24px rgba(200, 62, 59, 0.35);
  transform: translateY(-2px);
}

.li-btn-ghost {
  background: transparent;
  color: var(--cta-ghost-text, #808080);
}

.li-btn-ghost:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-gray-900, #333333);
}

/* Disabled overrides */
.li-btn:disabled {
  background: var(--cta-disabled-bg, #EDF0F2);
  color: var(--cta-disabled-text, #999999);
  box-shadow: none;
}

/* Utils */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.li-btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

:deep(.li-ripple-animation) {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple var(--dur-medium, 300ms) linear;
  background-color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.li-btn-secondary :deep(.li-ripple-animation),
.li-btn-ghost :deep(.li-ripple-animation) {
  background-color: rgba(0, 0, 0, 0.08);
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .li-btn {
    transition: none;
  }
  .li-btn:active {
    transform: none;
  }
  .li-btn-primary:hover:not(:disabled),
  .li-btn-danger:hover:not(:disabled) {
    transform: none;
  }
}
</style>
