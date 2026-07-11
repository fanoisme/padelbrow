<template>
  <div class="li-datepicker" :class="{ 'is-disabled': disabled }">
    <label v-if="label" class="li-datepicker-label">{{ label }}</label>
    
    <div class="li-datepicker-input-wrapper" @click="toggleCalendar" ref="wrapperRef">
      <div class="li-datepicker-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.8333 3.33333H4.16667C3.24619 3.33333 2.5 4.07953 2.5 5V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V5C17.5 4.07953 16.7538 3.33333 15.8333 3.33333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13.3333 1.66667V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6.66667 1.66667V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.5 8.33333H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <input 
        type="text" 
        class="li-datepicker-input" 
        :value="formattedDate" 
        :placeholder="placeholder"
        readonly
        :disabled="disabled"
      />
    </div>
    
    <div v-if="hint && !error" class="li-datepicker-hint">{{ hint }}</div>
    <div v-if="error" class="li-datepicker-error">{{ error }}</div>

    <Transition name="calendar-fade">
      <div v-if="isOpen" class="li-calendar-popover" ref="calendarRef">
        <div class="li-calendar-header">
          <button class="li-calendar-nav" @click="prevMonth">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="li-calendar-title">{{ monthName }} {{ currentYear }}</div>
          <button class="li-calendar-nav" @click="nextMonth">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div class="li-calendar-weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        
        <div class="li-calendar-days">
          <button 
            v-for="(day, index) in daysInMonth" 
            :key="index"
            class="li-calendar-day"
            :class="{ 
              'is-empty': !day.date,
              'is-today': day.isToday,
              'is-selected': day.isSelected
            }"
            :disabled="!day.date"
            @click="selectDate(day.date)"
          >
            {{ day.date ? day.date.getDate() : '' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Date,
    default: null
  },
  label: String,
  hint: String,
  error: String,
  placeholder: {
    type: String,
    default: 'Select a date'
  },
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const wrapperRef = ref(null);
const calendarRef = ref(null);

const currentDate = ref(props.modelValue || new Date());
const currentMonth = ref(currentDate.value.getMonth());
const currentYear = ref(currentDate.value.getFullYear());

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formattedDate = computed(() => {
  if (!props.modelValue) return '';
  return props.modelValue.toLocaleDateString();
});

const monthName = computed(() => monthNames[currentMonth.value]);

const daysInMonth = computed(() => {
  const days = [];
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay();
  const lastDate = new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const selected = props.modelValue ? new Date(props.modelValue) : null;
  if (selected) selected.setHours(0,0,0,0);

  // Empty slots for start of month
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null });
  }

  // Days
  for (let i = 1; i <= lastDate; i++) {
    const d = new Date(currentYear.value, currentMonth.value, i);
    days.push({
      date: d,
      isToday: d.getTime() === today.getTime(),
      isSelected: selected ? d.getTime() === selected.getTime() : false
    });
  }

  return days;
});

const toggleCalendar = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    currentDate.value = props.modelValue || new Date();
    currentMonth.value = currentDate.value.getMonth();
    currentYear.value = currentDate.value.getFullYear();
  }
};

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const selectDate = (date) => {
  if (!date) return;
  emit('update:modelValue', date);
  isOpen.value = false;
};

const handleClickOutside = (e) => {
  if (isOpen.value && 
      wrapperRef.value && !wrapperRef.value.contains(e.target) &&
      calendarRef.value && !calendarRef.value.contains(e.target)) {
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
.li-datepicker {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  width: 100%;
  font-family: var(--font-family, 'Inter', sans-serif);
  position: relative;
}

.li-datepicker-label {
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  color: var(--color-gray-800, #4D4D4D);
}

.li-datepicker-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.li-datepicker-icon {
  position: absolute;
  left: var(--space-m, 12px);
  color: var(--color-gray-500, #999999);
  display: flex;
  pointer-events: none;
}

.li-datepicker-input {
  width: 100%;
  height: 40px; /* Base height */
  padding: 0 var(--space-m, 12px) 0 40px;
  background-color: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-gray-300, #CCCCCC);
  border-radius: var(--radius-md, 8px);
  font-family: inherit;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #333333);
  transition: all var(--dur-short, 200ms) var(--ease-out);
  cursor: pointer;
}

.li-datepicker-input::placeholder {
  color: var(--color-gray-400, #B3B3B3);
}

.li-datepicker-input-wrapper:hover .li-datepicker-input {
  border-color: var(--color-gray-400, #B3B3B3);
}

.li-datepicker.is-disabled .li-datepicker-input-wrapper {
  cursor: not-allowed;
}

.li-datepicker.is-disabled .li-datepicker-input {
  background-color: var(--color-gray-100, #F2F2F2);
  color: var(--color-gray-500, #999999);
  cursor: not-allowed;
}

.li-datepicker-hint,
.li-datepicker-error {
  font-size: var(--text-tiny, 12px);
}

.li-datepicker-hint {
  color: var(--color-gray-500, #999999);
}

.li-datepicker-error {
  color: var(--color-red-500, #A33129);
}

/* Calendar Popover */
.li-calendar-popover {
  position: absolute;
  top: calc(100% + var(--space-xs, 4px));
  left: 0;
  width: 280px;
  background-color: var(--color-gray-0, #FFFFFF);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-dropdown, 0 8px 24px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--color-gray-200, #E6E6E6);
  padding: var(--space-m, 12px);
  z-index: 1000;
}

.li-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-m, 12px);
}

.li-calendar-title {
  font-size: var(--text-sm, 16px);
  font-weight: 600;
  color: var(--color-gray-900, #333333);
}

.li-calendar-nav {
  background: transparent;
  border: none;
  color: var(--color-gray-600, #808080);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
}

.li-calendar-nav:hover {
  background-color: var(--color-gray-100, #F2F2F2);
  color: var(--color-gray-900, #333333);
}

.li-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--text-tiny, 12px);
  font-weight: 500;
  color: var(--color-gray-500, #999999);
  margin-bottom: var(--space-s, 8px);
}

.li-calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.li-calendar-day {
  aspect-ratio: 1;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--text-sm, 14px);
  color: var(--color-gray-900, #333333);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur-micro, 120ms);
}

.li-calendar-day:hover:not(.is-empty):not(.is-selected) {
  background-color: var(--color-gray-100, #F2F2F2);
}

.li-calendar-day.is-empty {
  cursor: default;
}

.li-calendar-day.is-today {
  font-weight: 700;
  color: var(--color-orange-400, #FF6B00);
}

.li-calendar-day.is-selected {
  background-color: var(--color-orange-400, #FF6B00);
  color: var(--color-gray-0, #FFFFFF);
  font-weight: 600;
}

/* Transitions */
.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: opacity var(--dur-short, 200ms), transform var(--dur-short, 200ms);
}
.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
