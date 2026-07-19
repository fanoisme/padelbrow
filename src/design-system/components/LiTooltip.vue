<template>
  <div class="li-tooltip-wrapper" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide">
    <slot />
    <Teleport to="body">
      <Transition name="li-tooltip">
        <div
          v-if="visible"
          :class="['li-tooltip', `li-tooltip--${position}`]"
          :style="tooltipStyle"
          role="tooltip"
          :aria-hidden="!visible"
        >
          <span class="li-tooltip__arrow" />
          <span class="li-tooltip__text">{{ text }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  position: { type: String, default: 'top', validator: v => ['top', 'bottom', 'left', 'right'].includes(v) },
  delay: { type: Number, default: 400 },
})

const visible = ref(false)
const coords = ref({ x: 0, y: 0 })
let timer = null

const tooltipStyle = computed(() => ({
  left: `${coords.value.x}px`,
  top: `${coords.value.y}px`,
}))

function show(e) {
  clearTimeout(timer)
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const pos = calcPosition(rect)
  coords.value = pos
  timer = setTimeout(() => { visible.value = true }, props.delay)
}

function hide() {
  clearTimeout(timer)
  visible.value = false
}

function calcPosition(rect) {
  const offset = 8
  switch (props.position) {
    case 'top':    return { x: rect.left + rect.width / 2, y: rect.top - offset }
    case 'bottom': return { x: rect.left + rect.width / 2, y: rect.bottom + offset }
    case 'left':   return { x: rect.left - offset, y: rect.top + rect.height / 2 }
    case 'right':  return { x: rect.right + offset, y: rect.top + rect.height / 2 }
    default:       return { x: rect.left + rect.width / 2, y: rect.top - offset }
  }
}

onBeforeUnmount(() => {
  clearTimeout(timer)
})
</script>

<style scoped>
.li-tooltip-wrapper {
  display: inline-flex;
  position: relative;
}

.li-tooltip {
  position: fixed;
  z-index: 9999;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--color-gray-900, #FFFFFF);
  color: var(--color-gray-100, #121212);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.li-tooltip--top    { transform: translate(-50%, -100%); }
.li-tooltip--bottom { transform: translate(-50%, 0); }
.li-tooltip--left   { transform: translate(-100%, -50%); }
.li-tooltip--right  { transform: translate(0, -50%); }

.li-tooltip__arrow {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--color-gray-900, #FFFFFF);
  transform: rotate(45deg);
}

.li-tooltip--top .li-tooltip__arrow {
  bottom: -3px;
  left: calc(50% - 3px);
}

.li-tooltip--bottom .li-tooltip__arrow {
  top: -3px;
  left: calc(50% - 3px);
}

.li-tooltip--left .li-tooltip__arrow {
  right: -3px;
  top: calc(50% - 3px);
}

.li-tooltip--right .li-tooltip__arrow {
  left: -3px;
  top: calc(50% - 3px);
}

.li-tooltip__text {
  position: relative;
  z-index: 1;
}

.li-tooltip-enter-active { transition: opacity 0.15s ease-out, transform 0.15s ease-out; }
.li-tooltip-leave-active { transition: opacity 0.1s ease-in, transform 0.1s ease-in; }
.li-tooltip-enter-from,
.li-tooltip-leave-to { opacity: 0; transform: translate(-50%, calc(-50% - 4px)); }
</style>
