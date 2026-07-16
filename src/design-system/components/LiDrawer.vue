<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="li-drawer-fade">
      <div v-if="modelValue" class="li-drawer__backdrop" @click="closeOnBackdrop && close()" />
    </Transition>

    <!-- Panel -->
    <Transition :name="`li-drawer-slide-${placement}`">
      <div
        v-if="modelValue"
        :class="['li-drawer', `li-drawer--${placement}`, `li-drawer--${size}`]"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Drawer'"
        ref="drawerRef"
      >
        <!-- Header -->
        <div v-if="title || $slots.header" class="li-drawer__header">
          <h2 v-if="title" class="li-drawer__title">{{ title }}</h2>
          <slot name="header" />
          <button class="li-drawer__close" :aria-label="closeLabel || 'Close'" @click="close()">
            <LiIcon name="close" size="md" />
          </button>
        </div>

        <!-- Body -->
        <div class="li-drawer__body">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="li-drawer__footer">
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  placement: { type: String, default: 'right', validator: v => ['left', 'right', 'bottom'].includes(v) },
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg', 'full'].includes(v) },
  closeOnBackdrop: { type: Boolean, default: true },
  closeLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])

const drawerRef = ref(null)
const previousFocus = ref(null)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
    return
  }
  // Focus trap: Tab / Shift+Tab cycle within drawer
  if (e.key === 'Tab' && props.modelValue && drawerRef.value) {
    const focusable = drawerRef.value.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    previousFocus.value = document.activeElement
    document.body.style.overflow = 'hidden'
    // Focus the first focusable element after animation
    setTimeout(() => {
      if (drawerRef.value) {
        const focusable = drawerRef.value.querySelector('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
        if (focusable) focusable.focus()
      }
    }, 100)
  } else {
    document.body.style.overflow = ''
    if (previousFocus.value) {
      setTimeout(() => {
        if (previousFocus.value) previousFocus.value.focus()
        previousFocus.value = null
      }, 50)
    }
  }
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.li-drawer__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(34, 34, 51, 0.5);
  z-index: 9990;
}

.li-drawer {
  position: fixed;
  z-index: 10000;
  background: var(--color-gray-0, #FFFFFF);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Placement */
.li-drawer--left {
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 0 16px 16px 0;
}

.li-drawer--right {
  right: 0;
  top: 0;
  bottom: 0;
  border-radius: 16px 0 0 16px;
}

.li-drawer--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
}

/* Width sizing (left/right) */
.li-drawer--left.li-drawer--sm,
.li-drawer--right.li-drawer--sm { width: 320px; }

.li-drawer--left.li-drawer--md,
.li-drawer--right.li-drawer--md { width: 420px; }

.li-drawer--left.li-drawer--lg,
.li-drawer--right.li-drawer--lg { width: 560px; }

.li-drawer--left.li-drawer--full,
.li-drawer--right.li-drawer--full { width: 100vw; }

/* Header */
.li-drawer__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-gray-200, #1A1A1A);
  flex-shrink: 0;
}

.li-drawer__title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: var(--color-gray-900, #FFFFFF);
}

.li-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-gray-500, #999999);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-drawer__close:hover {
  background: var(--color-gray-100, #121212);
  color: var(--color-gray-700, #B3B3B3);
}

.li-drawer__close:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

/* Body */
.li-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

/* Footer */
.li-drawer__footer {
  padding: 12px 24px;
  border-top: 1px solid var(--color-gray-200, #1A1A1A);
  flex-shrink: 0;
}

/* Transitions — fade backdrop */
.li-drawer-fade-enter-active { transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-fade-leave-active { transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-fade-enter-from,
.li-drawer-fade-leave-to { opacity: 0; }

/* Transitions — slide left */
.li-drawer-slide-left-enter-active { transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-left-leave-active { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-left-enter-from { transform: translateX(-100%); }
.li-drawer-slide-left-leave-to   { transform: translateX(-100%); }

/* Transitions — slide right */
.li-drawer-slide-right-enter-active { transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-right-leave-active { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-right-enter-from { transform: translateX(100%); }
.li-drawer-slide-right-leave-to   { transform: translateX(100%); }

/* Transitions — slide bottom */
.li-drawer-slide-bottom-enter-active { transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-bottom-leave-active { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.li-drawer-slide-bottom-enter-from { transform: translateY(100%); }
.li-drawer-slide-bottom-leave-to   { transform: translateY(100%); }
</style>
