<template>
  <!--
    Lithium · LiGradientText
    Animated gradient shimmer text using brand tokens.
    Slots: default (text content)
  -->
  <span
    class="li-gradient-text"
    :class="{ 'li-gradient-text--animated': animated }"
    :style="gradientStyle"
  >
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Animate the gradient shimmer */
  animated: { type: Boolean, default: true },
  /** Custom gradient colors (array of 3+ CSS colors). Falls back to brand gold. */
  colors: { type: Array, default: null },
  /** Animation duration in seconds */
  duration: { type: Number, default: 3 },
  /** Gradient angle in degrees */
  angle: { type: Number, default: 135 },
})

const gradientStyle = computed(() => {
  const c = props.colors || [
    'var(--color-yellow-500, #F4A600)',
    'var(--color-yellow-300, #FDDD00)',
    'var(--color-orange-200, #FFA726)',
    'var(--color-yellow-400, #F9C700)',
    'var(--color-yellow-500, #F4A600)',
  ]
  return {
    '--li-gt-gradient': `linear-gradient(${props.angle}deg, ${c.join(', ')})`,
    '--li-gt-duration': `${props.duration}s`,
  }
})
</script>

<style scoped>
.li-gradient-text {
  background: var(--li-gt-gradient);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  display: inline;
}

.li-gradient-text--animated {
  animation: li-gt-shimmer var(--li-gt-duration, 3s) ease-in-out infinite;
}

@keyframes li-gt-shimmer {
  0%, 100% { background-position: 0% center; }
  50%      { background-position: 200% center; }
}

@media (prefers-reduced-motion: reduce) {
  .li-gradient-text--animated {
    animation: none;
  }
}
</style>
