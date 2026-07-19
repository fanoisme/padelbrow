<template>
  <div class="li-dropdown-wrapper" ref="wrapperRef">
    <div @click="toggle" class="li-dropdown__trigger">
      <slot name="trigger" />
    </div>
    <Teleport to="body">
      <Transition name="li-dropdown">
        <div
          v-if="open"
          :class="['li-dropdown', `li-dropdown--${align}`]"
          :style="dropdownStyle"
          role="menu"
          @click.stop
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
    <div v-if="open" class="li-dropdown__backdrop" @click="close" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  align: { type: String, default: 'left', validator: v => ['left', 'right'].includes(v) },
  closeOnSelect: { type: Boolean, default: true },
})

const emit = defineEmits(['open', 'close'])

const open = ref(false)
const wrapperRef = ref(null)
const coords = ref({ x: 0, y: 0 })

const dropdownStyle = computed(() => {
  const style = { top: `${coords.value.y}px` }
  if (props.align === 'right') {
    style.right = `${coords.value.x}px`
  } else {
    style.left = `${coords.value.x}px`
  }
  return style
})

let resizeObserver = null

function toggle() {
  open.value ? close() : show()
}

function show() {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  coords.value = {
    x: props.align === 'right' ? window.innerWidth - rect.right : rect.left,
    y: rect.bottom + 4,
  }
  open.value = true
  emit('open')
  document.addEventListener('keydown', onKeydown)
}

function close() {
  open.value = false
  emit('close')
  document.removeEventListener('keydown', onKeydown)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (open.value) show()
    })
    resizeObserver.observe(wrapperRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ open, close, toggle })
</script>

<style scoped>
.li-dropdown-wrapper { position: relative; display: inline-flex; }

.li-dropdown__trigger { cursor: pointer; user-select: none; }

.li-dropdown {
  position: fixed;
  z-index: 9998;
  min-width: 180px;
  padding: 4px;
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--color-gray-200, #1A1A1A);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--color-gray-900, #FFFFFF);
}

.li-dropdown__backdrop {
  position: fixed;
  inset: 0;
  z-index: 9997;
}

.li-dropdown-enter-active { transition: opacity 0.15s ease-out, transform 0.15s ease-out; }
.li-dropdown-leave-active { transition: opacity 0.1s ease-in, transform 0.1s ease-in; }
.li-dropdown-enter-from,
.li-dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
