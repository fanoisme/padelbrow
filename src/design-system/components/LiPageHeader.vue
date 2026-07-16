<template>
  <LiRevealOnScroll variant="fade-up">
    <div class="li-page-header">
      <div class="li-page-header__text">
        <span v-if="eyebrow" class="li-page-header__eyebrow">{{ eyebrow }}</span>
        <h1 class="li-page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="li-page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="li-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </LiRevealOnScroll>
</template>

<script setup>
import LiRevealOnScroll from './LiRevealOnScroll.vue'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.li-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-m, 16px);
}

.li-page-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.li-page-header__eyebrow {
  display: inline-block;
  width: fit-content;
  padding: 4px 12px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.35));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #B3B3B3);
  letter-spacing: 0.02em;
}

.li-page-header__title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-on-surface, #FFFFFF);
}

.li-page-header__subtitle {
  margin: 0;
  color: var(--color-on-surface-variant, #B3B3B3);
  font-size: 0.95rem;
}

.li-page-header__actions {
  display: flex;
  gap: var(--space-s, 8px);
  flex-wrap: wrap;
}
</style>
