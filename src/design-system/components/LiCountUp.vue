<template>
  <span class="li-countup">
    {{ prefix }}{{ displayValue }}{{ suffix }}
  </span>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  endVal: {
    type: Number,
    required: true
  },
  startVal: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 2000
  },
  decimals: {
    type: Number,
    default: 0
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  separator: {
    type: String,
    default: ','
  },
  decimal: {
    type: String,
    default: '.'
  },
  useEasing: {
    type: Boolean,
    default: true
  }
});

const displayValue = ref(formatNumber(props.startVal));
let animationFrame = null;

function formatNumber(num) {
  const numStr = num.toFixed(props.decimals);
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, props.separator);
  return parts.join(props.decimal);
}

function easeOutExpo(t, b, c, d) {
  return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
}

const startAnimation = () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);

  const startTime = performance.now();
  const startVal = props.startVal;
  const endVal = props.endVal;
  const change = endVal - startVal;

  const step = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    
    if (elapsedTime < props.duration) {
      let currentVal;
      if (props.useEasing) {
        currentVal = easeOutExpo(elapsedTime, startVal, change, props.duration);
      } else {
        currentVal = startVal + (change * (elapsedTime / props.duration));
      }
      displayValue.value = formatNumber(currentVal);
      animationFrame = requestAnimationFrame(step);
    } else {
      displayValue.value = formatNumber(endVal);
    }
  };

  animationFrame = requestAnimationFrame(step);
};

watch(() => props.endVal, () => {
  startAnimation();
});

onMounted(() => {
  startAnimation();
});
</script>

<style scoped>
.li-countup {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-variant-numeric: tabular-nums;
}
</style>
