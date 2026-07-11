<template>
  <div class="li-accordion">
    <slot />
  </div>
</template>

<script setup>
import { provide, ref } from 'vue'

const props = defineProps({
  // If provided, acts as controlled single-select (value = expanded item key)
  modelValue: { type: [String, Number], default: '' },
  // If true, multiple items can be expanded simultaneously
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const expandedItems = ref(new Set())

function isExpanded(key) {
  if (props.modelValue !== undefined && props.modelValue !== '') {
    return props.modelValue === key
  }
  return expandedItems.value.has(key)
}

function toggle(key) {
  if (props.modelValue !== undefined && props.modelValue !== '') {
    emit('update:modelValue', props.modelValue === key ? '' : key)
    return
  }

  const next = new Set(expandedItems.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    if (!props.multiple) next.clear()
    next.add(key)
  }
  expandedItems.value = next
}

provide('li-accordion', { isExpanded, toggle })
</script>

<style scoped>
.li-accordion {
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
}
</style>
