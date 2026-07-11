<template>
  <!--
    Lithium · LiMarquee
    Infinite horizontal scroll marquee for logos, badges, or text items.
    Uses CSS animation for smooth performance.
  -->
  <div
    class="li-marquee"
    :class="{ 'li-marquee--paused': paused }"
    :style="marqueeStyle"
    role="marquee"
    aria-label="Scrolling content"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="li-marquee__track" :style="trackStyle">
      <!-- Original content -->
      <div class="li-marquee__content">
        <slot />
      </div>
      <!-- Duplicate for seamless loop -->
      <div class="li-marquee__content" aria-hidden="true">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** Scroll speed (pixels per second) */
  speed: { type: Number, default: 40 },
  /** Pause animation on hover */
  pauseOnHover: { type: Boolean, default: true },
  /** Gap between items in pixels */
  gap: { type: Number, default: 48 },
  /** Animation direction */
  direction: { type: String, default: 'left', validator: v => ['left', 'right'].includes(v) },
})

const paused = ref(false)

const marqueeStyle = computed(() => ({
  '--li-marquee-gap': `${props.gap}px`,
}))

const trackStyle = computed(() => {
  const duration = Math.max(20, 1000 / props.speed)
  return {
    '--li-marquee-duration': `${duration}s`,
    '--li-marquee-direction': props.direction === 'left' ? 'normal' : 'reverse',
  }
})

function handleMouseEnter() {
  if (props.pauseOnHover) paused.value = true
}

function handleMouseLeave() {
  if (props.pauseOnHover) paused.value = false
}
</script>

<style scoped>
.li-marquee {
  overflow: hidden;
  width: 100%;
  position: relative;
  padding: var(--li-marquee-gap) 0;
}

.li-marquee__track {
  display: flex;
  gap: var(--li-marquee-gap, 48px);
  animation: li-marquee-scroll var(--li-marquee-duration, 25s) linear infinite;
  animation-direction: var(--li-marquee-direction, normal);
  width: fit-content;
}

.li-marquee--paused .li-marquee__track {
  animation-play-state: paused;
}

.li-marquee__content {
  display: flex;
  gap: var(--li-marquee-gap, 48px);
  flex-shrink: 0;
}

@keyframes li-marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .li-marquee__track {
    animation: none;
  }
}
</style>
