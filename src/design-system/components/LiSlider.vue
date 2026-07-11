<template>
  <div class="li-slider-wrapper" :class="{ 'li-slider-disabled': disabled }">
    <div v-if="label || valueLabel" class="li-slider-header">
      <span v-if="label" class="li-slider-label">{{ label }}</span>
      <span v-if="valueLabel" class="li-slider-value">{{ valueLabel }}</span>
    </div>
    
    <div class="li-slider-container">
      <input 
        type="range" 
        class="li-slider-input" 
        :min="min" 
        :max="max" 
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        @input="onInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      
      <div class="li-slider-track">
        <div class="li-slider-fill" :style="{ width: fillPercentage + '%' }"></div>
      </div>
      
      <div class="li-slider-thumb" :style="{ left: fillPercentage + '%' }" :class="{ 'is-focused': isFocused }">
        <div class="li-slider-thumb-inner"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  label: String,
  valueLabel: String,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);
const isFocused = ref(false);

const fillPercentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100;
});

const onInput = (e) => {
  emit('update:modelValue', Number(e.target.value));
};
</script>

<style scoped>
.li-slider-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
  width: 100%;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-slider-disabled {
  opacity: 0.6;
}

.li-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.li-slider-label {
  font-size: var(--text-sm, 16px);
  font-weight: 500;
  color: var(--color-gray-900, #333333);
}

.li-slider-value {
  font-size: var(--text-sm, 16px);
  color: var(--color-orange-400, #FF6B00);
  font-weight: 600;
}

.li-slider-container {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.li-slider-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
  margin: 0;
}

.li-slider-disabled .li-slider-input {
  cursor: not-allowed;
}

.li-slider-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background-color: var(--color-gray-200, #E6E6E6);
  border-radius: var(--radius-pill, 999px);
  overflow: hidden;
  z-index: 1;
}

.li-slider-fill {
  height: 100%;
  background-color: var(--color-orange-400, #FF6B00);
  transition: width 0.1s linear;
}

.li-slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background-color: var(--color-gray-0, #FFFFFF);
  border: 1.5px solid var(--color-gray-300, #CCCCCC);
  border-radius: 50%;
  z-index: 2;
  transition: left 0.1s linear, box-shadow var(--dur-micro, 120ms);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.li-slider-thumb.is-focused,
.li-slider-input:active + .li-slider-track + .li-slider-thumb {
  border-color: var(--color-orange-400, #FF6B00);
  box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.2);
}

.li-slider-thumb-inner {
  width: 8px;
  height: 8px;
  background-color: var(--color-orange-400, #FF6B00);
  border-radius: 50%;
}
</style>
