<template>
  <div :class="['li-accordion-item', { 'li-accordion-item--expanded': expanded, 'li-accordion-item--disabled': disabled }]">
    <button
      class="li-accordion-item__trigger"
      :aria-expanded="expanded"
      :aria-disabled="disabled"
      :disabled="disabled"
      @click="!disabled && accordion?.toggle(key)"
    >
      <span v-if="$slots.icon || icon" class="li-accordion-item__icon">
        <slot name="icon">
          <LiIcon :name="icon" size="sm" />
        </slot>
      </span>
      <span class="li-accordion-item__title">
        <slot name="title">{{ title }}</slot>
      </span>
      <span v-if="$slots.badge" class="li-accordion-item__badge">
        <slot name="badge" />
      </span>
      <LiIcon
        name="expand_more"
        size="sm"
        class="li-accordion-item__chevron"
      />
    </button>

    <div
      ref="bodyRef"
      class="li-accordion-item__body-wrapper"
      :style="{ maxHeight: expanded ? bodyHeight + 'px' : '0' }"
    >
      <div ref="contentRef" class="li-accordion-item__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject, watch, nextTick } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  key: { type: [String, Number], required: true },
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const accordion = inject('li-accordion', null)

const expanded = computed(() => accordion?.isExpanded(props.key) ?? false)

const bodyRef = ref(null)
const contentRef = ref(null)
const bodyHeight = ref(0)

watch(expanded, async (val) => {
  if (val) {
    await nextTick()
    if (contentRef.value) {
      bodyHeight.value = contentRef.value.scrollHeight
    }
  } else {
    bodyHeight.value = 0
  }
})
</script>

<style scoped>
.li-accordion-item {
  border-bottom: 1px solid var(--color-gray-200, #E6E6E6);
  font-family: 'Inter', system-ui, sans-serif;
}

.li-accordion-item:first-child {
  border-top: 1px solid var(--color-gray-200, #E6E6E6);
}

.li-accordion-item--disabled {
  opacity: 0.45;
}

.li-accordion-item__trigger {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  gap: 12px;
  border: none;
  background: transparent;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-900, #333333);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-accordion-item__trigger:hover:not(:disabled) {
  background: var(--color-gray-100, #F2F2F2);
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 6px;
}

.li-accordion-item__trigger:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
  border-radius: 4px;
}

.li-accordion-item__trigger:disabled {
  cursor: not-allowed;
}

.li-accordion-item__icon {
  display: flex;
  align-items: center;
  color: var(--color-gray-500, #999999);
  flex-shrink: 0;
}

.li-accordion-item--expanded .li-accordion-item__icon {
  color: var(--color-orange-400, #FF6B00);
}

.li-accordion-item__title {
  flex: 1;
  line-height: 20px;
}

.li-accordion-item__badge {
  flex-shrink: 0;
}

.li-accordion-item__chevron {
  color: var(--color-gray-400, #B3B3B3);
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-accordion-item--expanded .li-accordion-item__chevron {
  transform: rotate(180deg);
  color: var(--color-gray-700, #666666);
}

.li-accordion-item__body-wrapper {
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-accordion-item__body {
  padding: 0 0 16px 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-gray-700, #666666);
}

/* Icon spacing adjustment */
.li-accordion-item__body {
  padding-left: calc(12px + 20px + 12px); /* trigger padding + icon + gap */
}

@media (prefers-reduced-motion: reduce) {
  .li-accordion-item__chevron,
  .li-accordion-item__body-wrapper {
    transition: none;
  }
}
</style>
