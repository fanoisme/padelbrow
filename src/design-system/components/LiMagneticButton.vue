<template>
  <!--
    Lithium · LiMagneticButton
    CTA button with magnetic hover physics — the button subtly follows the cursor.
    Uses button-in-button trailing icon pattern from high-end design.
  -->
  <component
    :is="to ? 'a' : 'button'"
    ref="btnRef"
    class="li-magnetic-btn"
    :class="[
      `li-magnetic-btn--${variant}`,
      `li-magnetic-btn--${size}`,
      { 'li-magnetic-btn--pulse': pulse },
    ]"
    :href="to"
    :style="btnStyle"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <span class="li-magnetic-btn__label">
      <slot />
    </span>
    <span v-if="$slots.icon || icon" class="li-magnetic-btn__icon-wrap" :style="iconStyle">
      <slot name="icon">
        <span class="material-symbols-outlined">{{ icon }}</span>
      </slot>
    </span>
  </component>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** Button variant: primary, secondary, ghost */
  variant: { type: String, default: 'primary', validator: v => ['primary', 'secondary', 'ghost'].includes(v) },
  /** Size: sm, md, lg */
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) },
  /** Material icon name for trailing icon */
  icon: { type: String, default: null },
  /** Link target (renders as <a>) */
  to: { type: String, default: null },
  /** Enable accent pulse glow */
  pulse: { type: Boolean, default: false },
  /** Magnetic pull strength (px offset toward cursor) */
  strength: { type: Number, default: 4 },
})

const btnRef = ref(null)
const mx = ref(0)
const my = ref(0)
const imx = ref(0)
const imy = ref(0)

const btnStyle = computed(() => ({
  transform: `translate(${mx.value}px, ${my.value}px)`,
}))

const iconStyle = computed(() => ({
  transform: `translate(${imx.value}px, ${imy.value}px) scale(${1 + Math.abs(imx.value) * 0.01})`,
}))

function onMouseMove(e) {
  if (!btnRef.value) return
  const rect = btnRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = (e.clientX - cx) / rect.width
  const dy = (e.clientY - cy) / rect.height
  mx.value = Math.round(dx * props.strength * 10) / 10
  my.value = Math.round(dy * props.strength * 10) / 10
  imx.value = Math.round(dx * props.strength * 2 * 10) / 10
  imy.value = Math.round(dy * props.strength * 1.5 * 10) / 10
}

function onMouseLeave() {
  mx.value = 0
  my.value = 0
  imx.value = 0
  imy.value = 0
}
</script>

<style scoped>
.li-magnetic-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display, 'Inter', ui-sans-serif, sans-serif);
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-pill, 999px);
  transition: transform 350ms cubic-bezier(0.32, 0.72, 0, 1),
              filter var(--dur-short, 200ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
              box-shadow var(--dur-short, 200ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
  will-change: transform;
  position: relative;
  min-height: 44px;
  white-space: nowrap;
}

/* ── Sizes ── */
.li-magnetic-btn--sm { padding: 8px 20px; font-size: 0.8125rem; }
.li-magnetic-btn--md { padding: 12px 28px; font-size: 0.875rem; }
.li-magnetic-btn--lg { padding: 16px 40px; font-size: 0.9375rem; }

/* ── Primary ── */
.li-magnetic-btn--primary {
  background: var(--color-cta-primary-bg, #FFBC25);
  color: var(--color-cta-primary-text, #1E1E1E);
}
.li-magnetic-btn--primary:hover { filter: brightness(1.12); }

/* ── Secondary ── */
.li-magnetic-btn--secondary {
  background: transparent;
  color: var(--color-cta-secondary-text, var(--color-gray-900));
  border: 1.5px solid var(--color-cta-secondary-border, var(--color-gray-300));
}
.li-magnetic-btn--secondary:hover {
  border-color: var(--color-orange-400, #FF6B00);
}

/* ── Ghost ── */
.li-magnetic-btn--ghost {
  background: transparent;
  color: var(--color-cta-ghost-text, var(--color-gray-600));
}
.li-magnetic-btn--ghost:hover {
  background: var(--color-cta-ghost-hover-bg, var(--color-gray-100));
}

/* ── Active press ── */
.li-magnetic-btn:active {
  transform: translate(0, 0) scale(0.98) !important;
}

/* ── Focus ── */
.li-magnetic-btn:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 3px;
}

/* ── Pulse glow ── */
.li-magnetic-btn--pulse {
  animation: li-mb-pulse 3s ease-in-out infinite;
}

@keyframes li-mb-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 175, 3, 0.25); }
  50%      { box-shadow: 0 0 24px 4px rgba(255, 175, 3, 0.12); }
}

/* ── Label ── */
.li-magnetic-btn__label {
  position: relative;
  z-index: 1;
}

/* ── Trailing icon wrapper (button-in-button pattern) ── */
.li-magnetic-btn__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  transition: transform 400ms cubic-bezier(0.32, 0.72, 0, 1),
              background var(--dur-short, 200ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
  flex-shrink: 0;
}

.li-magnetic-btn__icon-wrap .material-symbols-outlined {
  font-size: 16px;
}

.li-magnetic-btn--primary .li-magnetic-btn__icon-wrap {
  background: rgba(0, 0, 0, 0.08);
}

.li-magnetic-btn:hover .li-magnetic-btn__icon-wrap {
  background: rgba(0, 0, 0, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .li-magnetic-btn {
    transition: none;
  }
  .li-magnetic-btn--pulse {
    animation: none;
    box-shadow: none;
  }
  .li-magnetic-btn__icon-wrap {
    transition: none;
  }
}
</style>
