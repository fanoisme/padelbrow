<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="li-modal-overlay" @click.self="handleOverlayClick">
        <div 
          class="li-modal" 
          role="dialog" 
          aria-modal="true"
          :class="[ `li-modal-${size}` ]"
        >
          <div v-if="title || $slots.header" class="li-modal-header">
            <slot name="header">
              <h2 class="li-modal-title">{{ title }}</h2>
            </slot>
            <button v-if="closable" class="li-modal-close" @click="close" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div class="li-modal-body">
            <slot></slot>
          </div>
          
          <div v-if="$slots.footer" class="li-modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  title: String,
  closable: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close();
  }
};

const handleEscape = (e) => {
  if (e.key === 'Escape' && props.modelValue && props.closable) {
    close();
  }
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.li-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-overlay, rgba(34, 34, 51, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-l, 16px);
}

.li-modal {
  background-color: var(--color-surface-bright, #141414);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-modal, 0 16px 48px rgba(0, 0, 0, 0.15));
  font-family: var(--font-family, 'Inter', sans-serif);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
}

.li-modal-sm { max-width: 400px; }
.li-modal-md { max-width: 560px; }
.li-modal-lg { max-width: 800px; }

.li-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xl, 24px) var(--space-xl, 24px) var(--space-l, 16px);
}

.li-modal-title {
  margin: 0;
  font-size: var(--text-lg, 24px);
  font-weight: 700;
  color: var(--color-gray-900, #FFFFFF);
}

.li-modal-close {
  background: transparent;
  border: none;
  color: var(--color-gray-500, #999999);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur-short, 200ms) var(--ease-out);
}

.li-modal-close:hover {
  color: var(--color-gray-900, #FFFFFF);
  background-color: var(--color-gray-100, #121212);
}

.li-modal-body {
  padding: 0 var(--space-xl, 24px) var(--space-xl, 24px);
  overflow-y: auto;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-700, #B3B3B3);
  line-height: var(--leading-body, 1.5);
}

.li-modal-footer {
  padding: var(--space-l, 16px) var(--space-xl, 24px) var(--space-xl, 24px);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-m, 12px);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--dur-medium, 300ms) var(--ease-out);
}

.modal-fade-enter-active .li-modal,
.modal-fade-leave-active .li-modal {
  transition: transform var(--dur-medium, 300ms) var(--ease-out);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .li-modal,
.modal-fade-leave-to .li-modal {
  transform: scale(0.95) translateY(20px);
}
</style>
