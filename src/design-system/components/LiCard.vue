<template>
  <div
    :class="['li-card', { 'li-card--hover': hover, 'li-card--flat': flat, 'li-card--glass': glass }]"
    :style="{ padding: paddingMap[padding] || undefined }"
  >
    <div v-if="$slots.header" class="li-card__header">
      <slot name="header" />
    </div>
    <div v-if="$slots.media" class="li-card__media">
      <slot name="media" />
    </div>
    <div v-if="$slots.default" class="li-card__body" :class="{ 'li-card__body--no-gutter': flush }">
      <slot />
    </div>
    <div v-if="$slots.footer" class="li-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  hover: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  glass: { type: Boolean, default: false },
  flush: { type: Boolean, default: false },
  padding: { type: String, default: 'md', validator: v => ['none', 'sm', 'md', 'lg', 'xl'].includes(v) },
})

const paddingMap = {
  none: '0',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
}
</script>

<style scoped>
.li-card {
  background: var(--color-surface-bright, #141414);
  border-radius: var(--radius-lg, 24px);
  font-family: 'Inter', system-ui, sans-serif;
  border: none;
  transition: box-shadow 0.3s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
              transform 0.3s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
  box-shadow: var(--shadow-sm);
}

.li-card--flat {
  box-shadow: none;
}

.li-card--glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.li-card--hover:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.li-card__header {
  padding: 0 0 var(--space-m, 12px) 0;
}

.li-card__media {
  overflow: hidden;
  border-radius: var(--radius-lg, 24px) var(--radius-lg, 24px) 0 0;
  margin: 0;
}

.li-card__body {
  line-height: 1.6;
}

.li-card__body--no-gutter {
  padding: 0;
}

.li-card__footer {
  padding: var(--space-m, 12px) 0 0 0;
}

@media (prefers-reduced-motion: reduce) {
  .li-card {
    transition: none;
  }
  .li-card--hover:hover {
    transform: none;
  }
}
</style>
