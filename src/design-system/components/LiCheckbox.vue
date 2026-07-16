<template>
  <label class="li-checkbox-wrapper" :class="{ 'li-checkbox-disabled': disabled }">
    <div class="li-checkbox-input-container">
      <input 
        type="checkbox" 
        class="sr-only" 
        :checked="modelValue" 
        :disabled="disabled"
        :indeterminate="indeterminate"
        @change="handleChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        ref="inputRef"
      />
      <div 
        class="li-checkbox-box" 
        :class="{ 
          'is-checked': modelValue || indeterminate, 
          'is-focused': isFocused,
          'is-round': round 
        }"
      >
        <svg v-if="indeterminate" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="8" height="2" fill="currentColor" />
        </svg>
        <svg v-else-if="modelValue" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    
    <div v-if="label || description || $slots.default" class="li-checkbox-content">
      <div class="li-checkbox-label">
        <slot>{{ label }}</slot>
      </div>
      <div v-if="description" class="li-checkbox-description">
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  label: String,
  description: String,
  disabled: Boolean,
  indeterminate: Boolean,
  round: Boolean
});

const emit = defineEmits(['update:modelValue']);
const isFocused = ref(false);
const inputRef = ref(null);

watch(() => props.indeterminate, (newVal) => {
  if (inputRef.value) {
    inputRef.value.indeterminate = newVal;
  }
});

onMounted(() => {
  if (inputRef.value && props.indeterminate) {
    inputRef.value.indeterminate = true;
  }
});

const handleChange = (e) => {
  emit('update:modelValue', e.target.checked);
};
</script>

<style scoped>
.li-checkbox-wrapper {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-s, 8px);
  cursor: pointer;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-checkbox-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.li-checkbox-input-container {
  position: relative;
  padding-top: 2px; /* align with first line of text */
}

.li-checkbox-box {
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--color-gray-400, #B3B3B3);
  border-radius: var(--radius-sm, 4px);
  background-color: var(--color-gray-0, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-0, #FFFFFF);
  transition: all var(--dur-micro, 120ms) var(--ease-out);
}

.li-checkbox-box.is-round {
  border-radius: var(--radius-pill, 999px);
}

.li-checkbox-box.is-checked {
  background-color: var(--color-orange-400, #FF6B00);
  border-color: var(--color-orange-400, #FF6B00);
}

.li-checkbox-box.is-focused {
  box-shadow: 0 0 0 2px var(--color-gray-0, #fff), 0 0 0 4px var(--color-orange-400, #FF6B00);
}

.li-checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.li-checkbox-label {
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #FFFFFF);
  line-height: 24px;
}

.li-checkbox-description {
  font-size: var(--text-xs, 14px);
  color: var(--color-gray-600, #808080);
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
