<template>
  <Transition name="banner-fade">
    <div v-if="isVisible" class="li-banner" :class="[`li-banner-${variant}`]">
      <div class="li-banner-icon">
        <slot name="icon">
          <svg v-if="variant === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 10.5L8.5 13L14 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="variant === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="variant === 'warning'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2L2 16H18L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 7V11M10 14H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </slot>
      </div>
      
      <div class="li-banner-content">
        <h4 v-if="title" class="li-banner-title">{{ title }}</h4>
        <div class="li-banner-message">
          <slot>{{ message }}</slot>
        </div>
        
        <div v-if="$slots.actions" class="li-banner-actions">
          <slot name="actions"></slot>
        </div>
      </div>
      
      <button v-if="dismissible" class="li-banner-close" @click="dismiss" aria-label="Dismiss banner">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  title: String,
  message: String,
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'error'].includes(v)
  },
  dismissible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'dismiss']);
const isVisible = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  isVisible.value = newVal;
});

const dismiss = () => {
  isVisible.value = false;
  emit('update:modelValue', false);
  emit('dismiss');
};
</script>

<style scoped>
.li-banner {
  display: flex;
  align-items: flex-start;
  padding: var(--space-m, 12px) var(--space-l, 16px);
  border-radius: var(--radius-md, 8px);
  gap: var(--space-m, 12px);
  font-family: var(--font-family, 'Inter', sans-serif);
  width: 100%;
}

.li-banner-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.li-banner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.li-banner-title {
  margin: 0;
  font-size: var(--text-sm, 16px);
  font-weight: 600;
  color: var(--color-gray-900, #FFFFFF);
}

.li-banner-message {
  font-size: var(--text-xs, 14px);
  color: var(--color-gray-800, #4D4D4D);
  line-height: 1.4;
}

.li-banner-actions {
  margin-top: var(--space-s, 8px);
  display: flex;
  gap: var(--space-m, 12px);
}

.li-banner-close {
  background: transparent;
  border: none;
  color: var(--color-gray-500, #999999);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  margin: -4px -4px -4px 0;
  transition: all var(--dur-short, 200ms);
}

/* Variants */
.li-banner-info {
  background-color: var(--color-blue-100, #E6E6FF);
}
.li-banner-info .li-banner-icon { color: var(--color-blue-500, #0047B2); }

.li-banner-success {
  background-color: var(--color-success-container, #D7F9E9);
}
.li-banner-success .li-banner-icon { color: var(--color-on-success-container, #059669); }

.li-banner-warning {
  background-color: var(--color-yellow-100, #FFF3D6);
}
.li-banner-warning .li-banner-icon { color: var(--color-orange-500, #FF3000); }

.li-banner-error {
  background-color: var(--color-error-container, #FDECEE);
}
.li-banner-error .li-banner-icon { color: var(--color-red-500, #A33129); }

.li-banner-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-gray-900, #FFFFFF);
}

/* Transitions */
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity var(--dur-medium, 300ms), transform var(--dur-medium, 300ms);
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
