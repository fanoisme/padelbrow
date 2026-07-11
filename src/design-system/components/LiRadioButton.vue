<template>
  <label class="li-radio-wrapper" :class="{ 'li-radio-disabled': disabled }">
    <div class="li-radio-input-container">
      <input 
        type="radio" 
        class="sr-only" 
        :value="value"
        :checked="isChecked" 
        :disabled="disabled"
        :name="name"
        @change="handleChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <div 
        class="li-radio-outer" 
        :class="{ 
          'is-checked': isChecked, 
          'is-focused': isFocused
        }"
      >
        <div class="li-radio-inner" :class="{ 'is-checked': isChecked }"></div>
      </div>
    </div>
    
    <div v-if="label || description || $slots.default" class="li-radio-content">
      <div class="li-radio-label">
        <slot>{{ label }}</slot>
      </div>
      <div v-if="description" class="li-radio-description">
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Boolean],
  value: [String, Number, Boolean],
  name: String,
  label: String,
  description: String,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);
const isFocused = ref(false);

const isChecked = computed(() => props.modelValue === props.value);

const handleChange = () => {
  emit('update:modelValue', props.value);
};
</script>

<style scoped>
.li-radio-wrapper {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-s, 8px);
  cursor: pointer;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-radio-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.li-radio-input-container {
  position: relative;
  padding-top: 2px;
}

.li-radio-outer {
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--color-gray-400, #B3B3B3);
  border-radius: 50%;
  background-color: var(--color-gray-0, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur-micro, 120ms) var(--ease-out);
}

.li-radio-outer.is-checked {
  border-color: var(--color-orange-400, #FF6B00);
}

.li-radio-outer.is-focused {
  box-shadow: 0 0 0 2px var(--color-gray-0, #fff), 0 0 0 4px var(--color-orange-400, #FF6B00);
}

.li-radio-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--color-orange-400, #FF6B00);
  transform: scale(0);
  transition: transform var(--dur-micro, 120ms) var(--ease-out);
}

.li-radio-inner.is-checked {
  transform: scale(1);
}

.li-radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.li-radio-label {
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #333333);
  line-height: 24px;
}

.li-radio-description {
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
