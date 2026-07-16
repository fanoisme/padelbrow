<template>
  <div class="li-timepicker" :class="{ 'is-disabled': disabled }">
    <label v-if="label" class="li-timepicker-label">{{ label }}</label>
    
    <div class="li-timepicker-input-wrapper" @click="toggleDropdown" ref="wrapperRef">
      <div class="li-timepicker-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 5V10L13.3333 11.6667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <input 
        type="text" 
        class="li-timepicker-input" 
        :value="formattedTime" 
        :placeholder="placeholder"
        readonly
        :disabled="disabled"
      />
    </div>
    
    <div v-if="hint && !error" class="li-timepicker-hint">{{ hint }}</div>
    <div v-if="error" class="li-timepicker-error">{{ error }}</div>

    <Transition name="dropdown-fade">
      <div v-if="isOpen" class="li-time-dropdown" ref="dropdownRef">
        <div class="li-time-columns">
          <!-- Hours -->
          <div class="li-time-column" ref="hoursColRef">
            <div 
              v-for="h in hoursList" 
              :key="h"
              class="li-time-item"
              :class="{ 'is-selected': currentHour === h }"
              @click="selectHour(h)"
            >
              {{ padZero(h) }}
            </div>
          </div>
          <!-- Minutes -->
          <div class="li-time-column" ref="minutesColRef">
            <div 
              v-for="m in minutesList" 
              :key="m"
              class="li-time-item"
              :class="{ 'is-selected': currentMinute === m }"
              @click="selectMinute(m)"
            >
              {{ padZero(m) }}
            </div>
          </div>
          <!-- AM/PM (Optional, 12h format could go here. For simplicity, 24h format implemented) -->
        </div>
        <div class="li-time-actions">
          <button class="li-time-btn li-time-btn-clear" @click="clearTime">Clear</button>
          <button class="li-time-btn li-time-btn-ok" @click="confirmTime">OK</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: {
    type: String, // e.g. "14:30"
    default: ''
  },
  label: String,
  hint: String,
  error: String,
  placeholder: {
    type: String,
    default: 'Select time'
  },
  minuteStep: {
    type: Number,
    default: 1 // usually 1, 5, 15, or 30
  },
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const wrapperRef = ref(null);
const dropdownRef = ref(null);
const hoursColRef = ref(null);
const minutesColRef = ref(null);

const currentHour = ref(null);
const currentMinute = ref(null);

const parseTime = (timeStr) => {
  if (!timeStr) return { h: 0, m: 0 };
  const parts = timeStr.split(':');
  return {
    h: parseInt(parts[0], 10) || 0,
    m: parseInt(parts[1], 10) || 0
  };
};

const padZero = (num) => num.toString().padStart(2, '0');

const formattedTime = computed(() => {
  if (!props.modelValue) return '';
  const { h, m } = parseTime(props.modelValue);
  return `${padZero(h)}:${padZero(m)}`;
});

const hoursList = Array.from({ length: 24 }, (_, i) => i);
const minutesList = computed(() => {
  const list = [];
  for (let i = 0; i < 60; i += props.minuteStep) {
    list.push(i);
  }
  return list;
});

const toggleDropdown = async () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    const { h, m } = parseTime(props.modelValue);
    currentHour.value = props.modelValue ? h : 0;
    currentMinute.value = props.modelValue ? m : 0;
    
    // Scroll to selected items
    await nextTick();
    scrollToSelected();
  }
};

const selectHour = (h) => {
  currentHour.value = h;
};

const selectMinute = (m) => {
  currentMinute.value = m;
};

const confirmTime = () => {
  const timeStr = `${padZero(currentHour.value)}:${padZero(currentMinute.value)}`;
  emit('update:modelValue', timeStr);
  isOpen.value = false;
};

const clearTime = () => {
  emit('update:modelValue', '');
  isOpen.value = false;
};

const scrollToSelected = () => {
  if (hoursColRef.value) {
    const selected = hoursColRef.value.querySelector('.is-selected');
    if (selected) hoursColRef.value.scrollTop = selected.offsetTop - 80;
  }
  if (minutesColRef.value) {
    const selected = minutesColRef.value.querySelector('.is-selected');
    if (selected) minutesColRef.value.scrollTop = selected.offsetTop - 80;
  }
};

const handleClickOutside = (e) => {
  if (isOpen.value && 
      wrapperRef.value && !wrapperRef.value.contains(e.target) &&
      dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.li-timepicker {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  width: 100%;
  font-family: var(--font-family, 'Inter', sans-serif);
  position: relative;
}

.li-timepicker-label {
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  color: var(--color-gray-800, #4D4D4D);
}

.li-timepicker-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.li-timepicker-icon {
  position: absolute;
  left: var(--space-m, 12px);
  color: var(--color-gray-500, #999999);
  display: flex;
  pointer-events: none;
}

.li-timepicker-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-m, 12px) 0 40px;
  background-color: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-gray-300, #2A2A2A);
  border-radius: var(--radius-md, 8px);
  font-family: inherit;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #FFFFFF);
  transition: all var(--dur-short, 200ms) var(--ease-out);
  cursor: pointer;
}

.li-timepicker-input::placeholder {
  color: var(--color-gray-400, #B3B3B3);
}

.li-timepicker-input-wrapper:hover .li-timepicker-input {
  border-color: var(--color-gray-400, #B3B3B3);
}

.li-timepicker.is-disabled .li-timepicker-input-wrapper {
  cursor: not-allowed;
}

.li-timepicker.is-disabled .li-timepicker-input {
  background-color: var(--color-gray-100, #121212);
  color: var(--color-gray-500, #999999);
  cursor: not-allowed;
}

.li-timepicker-hint,
.li-timepicker-error {
  font-size: var(--text-tiny, 12px);
}

.li-timepicker-hint {
  color: var(--color-gray-500, #999999);
}

.li-timepicker-error {
  color: var(--color-red-500, #A33129);
}

/* Dropdown */
.li-time-dropdown {
  position: absolute;
  top: calc(100% + var(--space-xs, 4px));
  left: 0;
  width: 200px;
  background-color: var(--color-gray-0, #FFFFFF);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-dropdown, 0 8px 24px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--color-gray-200, #1A1A1A);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.li-time-columns {
  display: flex;
  height: 200px;
  border-bottom: 1px solid var(--color-gray-200, #1A1A1A);
}

.li-time-column {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  border-right: 1px solid var(--color-gray-100, #121212);
}

.li-time-column:last-child {
  border-right: none;
}

/* Hide scrollbar for cleaner look */
.li-time-column::-webkit-scrollbar {
  width: 0px;
}

.li-time-item {
  padding: var(--space-s, 8px) 0;
  text-align: center;
  font-size: var(--text-sm, 14px);
  color: var(--color-gray-700, #B3B3B3);
  cursor: pointer;
  transition: all var(--dur-micro, 120ms);
}

.li-time-item:hover {
  background-color: var(--color-gray-100, #121212);
}

.li-time-item.is-selected {
  background-color: var(--color-yellow-100, #FFF3D6);
  color: var(--color-orange-400, #FF6B00);
  font-weight: 600;
}

.li-time-actions {
  display: flex;
  padding: var(--space-s, 8px);
  gap: var(--space-s, 8px);
  justify-content: flex-end;
  background-color: var(--color-gray-0, #FFFFFF);
}

.li-time-btn {
  background: transparent;
  border: none;
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: var(--radius-sm, 4px);
}

.li-time-btn-clear {
  color: var(--color-gray-600, #808080);
}

.li-time-btn-clear:hover {
  background-color: var(--color-gray-100, #121212);
}

.li-time-btn-ok {
  color: var(--color-orange-400, #FF6B00);
}

.li-time-btn-ok:hover {
  background-color: var(--color-yellow-100, #FFF3D6);
}

/* Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--dur-short, 200ms), transform var(--dur-short, 200ms);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
