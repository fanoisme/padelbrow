<template>
  <div :class="['li-progress', { 'li-progress--indeterminate': indeterminate }]" role="progressbar" :aria-valuenow="indeterminate ? undefined : clampedValue" :aria-valuemin="0" :aria-valuemax="100" :aria-label="label || undefined">
    <div class="li-progress__track">
      <div
        :class="['li-progress__fill', `li-progress__fill--${variant}`]"
        :style="{ width: indeterminate ? '40%' : `${clampedValue}%` }"
      />
    </div>
    <span v-if="showValue && !indeterminate" class="li-progress__value">{{ clampedValue }}%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  variant: { type: String, default: 'brand', validator: v => ['brand', 'success', 'warning', 'error', 'info'].includes(v) },
  indeterminate: { type: Boolean, default: false },
  showValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

const clampedValue = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<style scoped>
.li-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', system-ui, sans-serif;
}

.li-progress__track {
  flex: 1;
  height: 6px;
  background: var(--color-gray-200, #1A1A1A);
  border-radius: 999px;
  overflow: hidden;
}

.li-progress__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-progress__fill--brand   { background: var(--color-orange-400, #FF6B00); }
.li-progress__fill--success { background: var(--color-green-400, #10B981); }
.li-progress__fill--warning { background: var(--color-orange-400, #FF6B00); }
.li-progress__fill--error   { background: var(--color-red-400, #C83E3B); }
.li-progress__fill--info    { background: var(--color-blue-400, #2563EB); }

.li-progress--indeterminate .li-progress__fill {
  animation: li-progress-indeterminate 1.5s ease-in-out infinite;
}

@keyframes li-progress-indeterminate {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(150%); }
  100% { transform: translateX(350%); }
}

.li-progress__value {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-600, #808080);
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}
</style>
