<template>
  <div class="li-select-wrapper" :class="{ 'li-select-error': error, 'li-select-disabled': disabled }">
    <label v-if="label" class="li-select-label">{{ label }}</label>
    
    <div class="li-select-input-group" :class="{ 'is-focused': isFocused }">
      <span v-if="iconLeft || $slots.iconLeft" class="li-select-icon li-select-icon-left">
        <slot name="iconLeft">{{ iconLeft }}</slot>
      </span>
      
      <select 
        class="li-select-input"
        :value="modelValue"
        :disabled="disabled"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"
      >
        <option v-if="placeholder" value="" disabled selected hidden>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      
      <span class="li-select-icon li-select-icon-right">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>

    <div v-if="helperText || error" class="li-select-helper">
      {{ error || helperText }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  options: {
    type: Array,
    default: () => [],
    // Each option: { label: String, value: Any }
  },
  label: String,
  placeholder: String,
  iconLeft: String,
  error: String,
  helperText: String,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);

const isFocused = ref(false);

const onChange = (e) => {
  emit('update:modelValue', e.target.value);
};

const onFocus = (e) => {
  isFocused.value = true;
  emit('focus', e);
};

const onBlur = (e) => {
  isFocused.value = false;
  emit('blur', e);
};
</script>

<style scoped>
.li-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  font-family: var(--font-family, 'Inter', sans-serif);
  width: 100%;
}

.li-select-label {
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  color: var(--color-gray-800, #4D4D4D);
}

.li-select-input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-surface-bright, #141414);
  border: 1.5px solid var(--color-gray-300, #2A2A2A);
  border-radius: var(--radius-sm, 4px);
  transition: border-color var(--dur-short, 200ms) var(--ease-out);
}

.li-select-input-group.is-focused {
  border-color: var(--color-orange-400, #FF6B00);
}

.li-select-error .li-select-input-group {
  border-color: var(--color-red-400, #C83E3B);
}

.li-select-disabled .li-select-input-group {
  background: var(--color-gray-100, #121212);
  border-color: var(--color-gray-200, #1A1A1A);
}

.li-select-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 36px 12px 16px; /* extra padding on right for chevron */
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #FFFFFF);
  outline: none;
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
}

.li-select-icon-left + .li-select-input {
  padding-left: 0;
}

.li-select-disabled .li-select-input {
  color: var(--color-gray-500, #999999);
  cursor: not-allowed;
}

.li-select-icon {
  padding: 0 12px;
  color: var(--color-gray-600, #808080);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Let clicks pass through to select */
}

.li-select-icon-right {
  position: absolute;
  right: 0;
}

.li-select-helper {
  font-size: var(--text-xxs, 12px);
  color: var(--color-gray-600, #808080);
  min-height: 16px;
}

.li-select-error .li-select-helper {
  color: var(--color-red-500, #A33129);
}
</style>
