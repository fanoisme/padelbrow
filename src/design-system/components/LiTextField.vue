<template>
  <div class="li-textfield-wrapper" :class="{ 'li-textfield-error': error, 'li-textfield-disabled': disabled }">
    <label v-if="label" class="li-textfield-label">{{ label }}</label>
    
    <div class="li-textfield-input-group" :class="{ 'is-focused': isFocused }">
      <span v-if="prefix || $slots.prefix" class="li-textfield-prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </span>
      
      <textarea 
        v-if="type === 'area'"
        ref="inputRef"
        class="li-textfield-input li-textfield-textarea"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      ></textarea>
      <input 
        v-else
        ref="inputRef"
        class="li-textfield-input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
      
      <span v-if="suffix || $slots.suffix" class="li-textfield-suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </span>
    </div>

    <div v-if="helperText || error" class="li-textfield-helper">
      {{ error || helperText }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  type: {
    type: String,
    default: 'text'
  },
  prefix: String,
  suffix: String,
  error: String,
  helperText: String,
  disabled: Boolean,
  rows: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);

const isFocused = ref(false);
const inputRef = ref(null);

const onInput = (e) => {
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
.li-textfield-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  font-family: var(--font-family, 'Inter', sans-serif);
  width: 100%;
}

.li-textfield-label {
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  color: var(--color-gray-800, #4D4D4D);
}

.li-textfield-input-group {
  display: flex;
  align-items: center;
  background: var(--color-gray-0, #FFFFFF);
  border: 1.5px solid var(--color-gray-300, #CCCCCC);
  border-radius: var(--radius-sm, 4px);
  transition: border-color var(--dur-short, 200ms) var(--ease-out);
  overflow: hidden;
}

.li-textfield-input-group.is-focused {
  border-color: var(--color-orange-400, #FF6B00);
}

.li-textfield-error .li-textfield-input-group {
  border-color: var(--color-red-400, #C83E3B);
}

.li-textfield-disabled .li-textfield-input-group {
  background: var(--color-gray-100, #F2F2F2);
  border-color: var(--color-gray-200, #E6E6E6);
}

.li-textfield-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 16px;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #333333);
  outline: none;
  width: 100%;
}

.li-textfield-textarea {
  resize: vertical;
  min-height: 80px;
}

.li-textfield-input::placeholder {
  color: var(--color-gray-400, #B3B3B3);
}

.li-textfield-disabled .li-textfield-input {
  color: var(--color-gray-500, #999999);
  cursor: not-allowed;
}

.li-textfield-prefix,
.li-textfield-suffix {
  padding: 0 12px;
  color: var(--color-gray-600, #808080);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm, 16px);
}

.li-textfield-prefix { padding-right: 0; }
.li-textfield-suffix { padding-left: 0; }

.li-textfield-helper {
  font-size: var(--text-xxs, 12px);
  color: var(--color-gray-600, #808080);
  min-height: 16px;
}

.li-textfield-error .li-textfield-helper {
  color: var(--color-red-500, #A33129);
}
</style>
