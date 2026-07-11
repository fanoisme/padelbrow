<template>
  <Teleport to="body">
    <div class="li-toast-container">
      <TransitionGroup name="toast-list">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          class="li-toast"
          :class="`li-toast-${toast.type}`"
        >
          <div class="li-toast-icon">
            <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 10.5L8.5 13L14 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L2 16H18L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 7V11M10 14H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="li-toast-message">
            {{ toast.message }}
          </div>
          <button class="li-toast-close" @click="removeToast(toast.id)" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<style scoped>
.li-toast-container {
  position: fixed;
  bottom: var(--space-xl, 24px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-s, 8px);
  z-index: 2000;
  pointer-events: none;
  width: 100%;
  max-width: 400px;
  padding: 0 var(--space-l, 16px);
}

.li-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  padding: var(--space-m, 12px) var(--space-l, 16px);
  background-color: var(--color-gray-900, #333333);
  color: var(--color-gray-0, #FFFFFF);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-dropdown, 0 8px 24px rgba(0,0,0,0.1));
  gap: var(--space-s, 8px);
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.li-toast-message {
  flex: 1;
  font-size: var(--text-sm, 16px);
  line-height: 1.4;
}

.li-toast-close {
  background: transparent;
  border: none;
  color: var(--color-gray-400, #B3B3B3);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  transition: all var(--dur-short, 200ms);
}

.li-toast-close:hover {
  color: var(--color-gray-0, #FFFFFF);
  background-color: rgba(255, 255, 255, 0.1);
}

/* Variants */
.li-toast-success .li-toast-icon { color: var(--color-green-400, #10B981); }
.li-toast-error .li-toast-icon { color: var(--color-red-400, #C83E3B); }
.li-toast-warning .li-toast-icon { color: var(--color-yellow-400, #F9C700); }
.li-toast-info .li-toast-icon { color: var(--color-blue-400, #2563EB); }

/* Transitions */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all var(--dur-medium, 300ms) var(--ease-out);
}
.toast-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
