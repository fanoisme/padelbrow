<template>
  <!--
    Lithium · LiParallaxSection
    Scroll-driven parallax wrapper. Content moves at a fraction of scroll speed.
    Uses IntersectionObserver + requestAnimationFrame for GPU-safe transforms.
  -->
  <div
    ref="sectionRef"
    class="li-parallax"
    :style="parallaxStyle"
  >
    <div
      class="li-parallax__bg"
      :style="bgStyle"
      aria-hidden="true"
    >
      <slot name="background" />
    </div>
    <div class="li-parallax__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  /** Parallax speed factor (0 = static, 1 = full scroll speed). Negative = reverse. */
  speed: { type: Number, default: 0.3 },
  /** Background element height as percentage of container (creates depth) */
  bgHeight: { type: String, default: '120%' },
})

const sectionRef = ref(null)
const offset = ref(0)
let ticking = false

const parallaxStyle = computed(() => ({
  '--li-parallax-bg-height': props.bgHeight,
}))

const bgStyle = computed(() => ({
  transform: `translate3d(0, ${offset.value}px, 0)`,
  willChange: 'transform',
}))

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    if (!sectionRef.value) { ticking = false; return }
    const rect = sectionRef.value.getBoundingClientRect()
    const viewH = window.innerHeight
    if (rect.bottom > 0 && rect.top < viewH) {
      const progress = (rect.top + rect.height) / (viewH + rect.height)
      offset.value = Math.round((progress - 0.5) * 100 * props.speed)
    }
    ticking = false
  })
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.li-parallax {
  position: relative;
  overflow: hidden;
}

.li-parallax__bg {
  position: absolute;
  inset: 0;
  height: var(--li-parallax-bg-height, 120%);
  top: -10%;
  z-index: 0;
  pointer-events: none;
}

.li-parallax__content {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .li-parallax__bg {
    transform: none !important;
    top: 0;
    height: 100%;
  }
}
</style>
