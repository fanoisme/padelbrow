<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="modelValue" class="li-bottomsheet-overlay" @click.self="handleOverlayClick">
        <Transition name="sheet-slide" appear>
          <div 
            class="li-bottomsheet" 
            role="dialog" 
            aria-modal="true"
          >
            <div class="li-bottomsheet-drag-handle">
              <div class="li-bottomsheet-drag-bar"></div>
            </div>
            
            <div v-if="title || $slots.header" class="li-bottomsheet-header">
              <slot name="header">
                <h3 class="li-bottomsheet-title">{{ title }}</h3>
              </slot>
              <button v-if="closable" class="li-bottomsheet-close" @click="close" aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div class="li-bottomsheet-body">
              <slot></slot>
            </div>
            
            <div v-if="$slots.footer" class="li-bottomsheet-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
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
.li-bottomsheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-overlay, rgba(34, 34, 51, 0.8));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.li-bottomsheet {
  background-color: var(--color-surface-bright, #141414);
  border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
  box-shadow: var(--shadow-modal, 0 -8px 24px rgba(0, 0, 0, 0.1));
  font-family: var(--font-family, 'Inter', sans-serif);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  max-width: 600px; /* limits width on desktop */
}

.li-bottomsheet-drag-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

.li-bottomsheet-drag-bar {
  width: 40px;
  height: 4px;
  background-color: var(--color-gray-300, #2A2A2A);
  border-radius: 2px;
}

.li-bottomsheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s, 8px) var(--space-l, 16px) var(--space-m, 12px);
}

.li-bottomsheet-title {
  margin: 0;
  font-size: var(--text-md, 20px);
  font-weight: 700;
  color: var(--color-gray-900, #FFFFFF);
}

.li-bottomsheet-close {
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

.li-bottomsheet-close:hover {
  color: var(--color-gray-900, #FFFFFF);
  background-color: var(--color-gray-100, #121212);
}

.li-bottomsheet-body {
  padding: 0 var(--space-l, 16px) var(--space-l, 16px);
  overflow-y: auto;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-700, #B3B3B3);
}

.li-bottomsheet-footer {
  padding: var(--space-l, 16px);
  border-top: 1px solid var(--color-gray-200, #1A1A1A);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}

/* Transitions */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity var(--dur-medium, 300ms) var(--ease-out);
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active {
  transition: transform 280ms cubic-bezier(.2,.8,.2,1);
}
.sheet-slide-leave-active {
  transition: transform 200ms cubic-bezier(.4,0,1,1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
