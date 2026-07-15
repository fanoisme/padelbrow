<template>
  <span
    class="li-icon"
    :class="[`li-icon--${size}`, { 'li-icon--filled': filled }]"
    :style="{ color }"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="!decorative ? label : undefined"
  >
    {{ name }}
  </span>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg', 'xl'].includes(v) },
  filled: { type: Boolean, default: false },
  color: { type: String, default: 'inherit' },
  decorative: { type: Boolean, default: true },
  label: { type: String, default: '' },
})
</script>

<style scoped>
.li-icon {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  user-select: none;
  flex-shrink: 0;
}

.li-icon--sm  { font-size: 16px; width: 16px; height: 16px; }
.li-icon--md  { font-size: 20px; width: 20px; height: 20px; }
.li-icon--lg  { font-size: 24px; width: 24px; height: 24px; }
.li-icon--xl  { font-size: 32px; width: 32px; height: 32px; }

.li-icon--filled {
  font-variation-settings: 'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}
</style>
