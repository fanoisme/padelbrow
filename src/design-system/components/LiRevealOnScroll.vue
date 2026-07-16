<template>
  <!--
    Lithium · LiRevealOnScroll
    Wraps content and reveals it with rich animation when scrolled into view.
    Variants: fade-up, fade-down, fade-left, fade-right, scale-in, blur-in.
    Supports staggered children via --reveal-i custom property.
  -->
  <div
    ref="elRef"
    class="li-reveal"
    :class="[
      `li-reveal--${variant}`,
      { 'li-reveal--visible': visible, 'li-reveal--stagger': stagger },
    ]"
    :style="revealStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  /** Animation variant */
  variant: {
    type: String,
    default: 'fade-up',
    validator: v => ['fade-up', 'fade-down', 'fade-left', 'fade-right', 'scale-in', 'blur-in'].includes(v),
  },
  /** Stagger children (each child gets incrementing delay) */
  stagger: { type: Boolean, default: false },
  /** Stagger delay per child in ms */
  staggerDelay: { type: Number, default: 80 },
  /** Animation delay in ms */
  delay: { type: Number, default: 0 },
  /** Animation duration in ms */
  duration: { type: Number, default: 700 },
  /** IntersectionObserver threshold */
  threshold: { type: Number, default: 0.1 },
  /** Root margin for early/late trigger */
  rootMargin: { type: String, default: '0px 0px -60px 0px' },
})

const elRef = ref(null)
const visible = ref(false)
let observer = null
let fallbackTimer = null

const revealStyle = computed(() => ({
  '--li-reveal-delay': `${props.delay}ms`,
  '--li-reveal-duration': `${props.duration}ms`,
  '--li-reveal-stagger-delay': `${props.staggerDelay}ms`,
}))

function reveal() {
  if (visible.value) return
  visible.value = true
  if (observer) { observer.disconnect(); observer = null }
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
}

onMounted(() => {
  if (!elRef.value) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveal()
    return
  }

  // Fallback: IntersectionObserver can miss elements during out-in page
  // transitions. Reveal unconditionally after a short delay as safety net.
  fallbackTimer = setTimeout(reveal, 500)

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal()
      })
    },
    { threshold: props.threshold, rootMargin: props.rootMargin }
  )
  observer.observe(elRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (fallbackTimer) clearTimeout(fallbackTimer)
})
</script>

<style scoped>
.li-reveal {
  transition:
    opacity var(--li-reveal-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
    transform var(--li-reveal-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
    filter var(--li-reveal-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--li-reveal-delay, 0ms);
}

/* ── Hidden states ── */
.li-reveal--fade-up    { opacity: 0; transform: translateY(40px); }
.li-reveal--fade-down  { opacity: 0; transform: translateY(-40px); }
.li-reveal--fade-left  { opacity: 0; transform: translateX(40px); }
.li-reveal--fade-right { opacity: 0; transform: translateX(-40px); }
.li-reveal--scale-in   { opacity: 0; transform: scale(0.92); }
.li-reveal--blur-in    { opacity: 0; filter: blur(12px); transform: translateY(20px); }

/* ── Visible states ── */
.li-reveal--visible {
  opacity: 1;
  transform: translateY(0) translateX(0) scale(1);
  filter: blur(0);
}

/* ── Stagger children ── */
.li-reveal--stagger > * {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity var(--li-reveal-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
    transform var(--li-reveal-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1);
}

.li-reveal--stagger > *:nth-child(1)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 0); }
.li-reveal--stagger > *:nth-child(2)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 1); }
.li-reveal--stagger > *:nth-child(3)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 2); }
.li-reveal--stagger > *:nth-child(4)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 3); }
.li-reveal--stagger > *:nth-child(5)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 4); }
.li-reveal--stagger > *:nth-child(6)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 5); }
.li-reveal--stagger > *:nth-child(7)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 6); }
.li-reveal--stagger > *:nth-child(8)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 7); }
.li-reveal--stagger > *:nth-child(9)  { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 8); }
.li-reveal--stagger > *:nth-child(10) { transition-delay: calc(var(--li-reveal-delay, 0ms) + var(--li-reveal-stagger-delay, 80ms) * 9); }

.li-reveal--visible.li-reveal--stagger > * {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .li-reveal,
  .li-reveal--stagger > * {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }
}
</style>
