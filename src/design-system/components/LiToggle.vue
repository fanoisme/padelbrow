<template>
  <label class="li-toggle-wrapper" :class="{ 'li-toggle-disabled': disabled }">
    <div class="li-toggle">
      <input 
        type="checkbox" 
        class="sr-only" 
        :checked="modelValue" 
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.checked)"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <div 
        class="li-toggle-track" 
        :class="{ 'is-checked': modelValue, 'is-focused': isFocused }"
      >
        <div class="li-toggle-thumb" :class="{ 'is-checked': modelValue }"></div>
      </div>
    </div>
    <span v-if="label || $slots.default" class="li-toggle-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  modelValue: Boolean,
  label: String,
  disabled: Boolean
});

defineEmits(['update:modelValue']);

const isFocused = ref(false);
</script>

<style scoped>
.li-toggle-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--space-m, 12px);
  cursor: pointer;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-toggle-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.li-toggle {
  position: relative;
  width: 44px;
  height: 24px;
}

.li-toggle-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-gray-300, #CCCCCC);
  border-radius: var(--radius-pill, 999px);
  transition: background-color var(--dur-short, 200ms) var(--ease-out);
}

.li-toggle-track.is-checked {
  background-color: var(--color-orange-400, #FF6B00);
}

.li-toggle-track.is-focused {
  box-shadow: 0 0 0 2px var(--color-gray-0, #fff), 0 0 0 4px var(--color-orange-400, #FF6B00);
}

.li-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: var(--color-gray-0, #FFFFFF);
  border-radius: 50%;
  transition: transform var(--dur-micro, 120ms) var(--ease-out);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.li-toggle-thumb.is-checked {
  transform: translateX(20px);
}

.li-toggle-label {
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #333333);
}

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
</style>
