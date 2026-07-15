<template>
  <!--
    Lithium · LiGlassCard
    Organic frosted glass card with fluid depth.
    Soft edges, no rigid borders, natural shadows.
  -->
  <div
    class="li-glass-card"
    :class="[
      `li-glass-card--${variant}`,
      `li-glass-card--${size}`,
      { 'li-glass-card--hoverable': hoverable },
    ]"
    :style="cardStyle"
  >
    <div class="li-glass-card__surface" :class="{ 'li-textured': textured }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Card variant: light, dark, accent */
  variant: { type: String, default: 'light', validator: v => ['light', 'dark', 'accent'].includes(v) },
  /** Padding size: sm, md, lg */
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) },
  /** Enable hover lift effect */
  hoverable: { type: Boolean, default: true },
  /** Custom border radius */
  radius: { type: String, default: null },
  /** Overlay a subtle noise texture (Design Guide §1C). Set false for compact/dense uses. */
  textured: { type: Boolean, default: true },
})

const cardStyle = computed(() => ({
  '--li-gc-radius': props.radius || 'var(--radius-xl, 24px)',
}))
</script>

<style scoped>
.li-glass-card {
  position: relative;
  transition: transform 0.4s var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1)),
              box-shadow 0.4s var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
}

.li-glass-card--hoverable:hover {
  transform: translateY(-6px) scale(1.01);
}

/* ── Surface — Single layer organic glass ── */
.li-glass-card__surface {
  position: relative;
  border-radius: var(--li-gc-radius, 24px);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.li-glass-card--hoverable:hover .li-glass-card__surface {
  border-color: rgba(255, 255, 255, 0.2);
}

/* Soft inner glow instead of hard inset shadow */
.li-glass-card__surface::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
  border-radius: var(--li-gc-radius, 24px) var(--li-gc-radius, 24px) 0 0;
  pointer-events: none;
}

/* ── Size variants ── */
.li-glass-card--sm .li-glass-card__surface { padding: 16px; }
.li-glass-card--md .li-glass-card__surface { padding: 24px; }
.li-glass-card--lg .li-glass-card__surface { padding: 32px; }

/* ── Variant: Light (default) ── */
.li-glass-card--light .li-glass-card__surface {
  background: rgba(255, 255, 255, 0.55);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.03);
}

.li-glass-card--light.li-glass-card--hoverable:hover .li-glass-card__surface {
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.04);
}

/* ── Variant: Dark ── */
.li-glass-card--dark .li-glass-card__surface {
  background: rgba(33, 35, 36, 0.6);
  color: var(--color-gray-0, #FFFFFF);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Variant: Accent (brand tint) ── */
.li-glass-card--accent .li-glass-card__surface {
  background: rgba(255, 175, 3, 0.06);
  box-shadow:
    0 8px 32px rgba(255, 175, 3, 0.08),
    0 2px 8px rgba(255, 175, 3, 0.04);
}

@media (prefers-reduced-motion: reduce) {
  .li-glass-card {
    transition: none;
  }
  .li-glass-card--hoverable:hover {
    transform: none;
  }
}
</style>
