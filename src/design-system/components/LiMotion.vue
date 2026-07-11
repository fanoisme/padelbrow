<template>
  <Transition
    :name="`motion-${type}`"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
    :css="!useJavascript"
  >
    <slot v-if="isVisible"></slot>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'fade-up', // fade-up, fade-down, fade-left, fade-right, scale-in, blur-in
    validator: (v) => ['fade-up', 'fade-down', 'fade-left', 'fade-right', 'scale-in', 'blur-in'].includes(v)
  },
  delay: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 420 // Based on design.md "hero entrance" length
  },
  useJavascript: {
    type: Boolean,
    default: false
  }
});

const isVisible = ref(false);

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.delay > 0) {
      setTimeout(() => { isVisible.value = true; }, props.delay);
    } else {
      isVisible.value = true;
    }
  } else {
    isVisible.value = false;
  }
});

onMounted(() => {
  if (props.modelValue) {
    if (props.delay > 0) {
      setTimeout(() => { isVisible.value = true; }, props.delay);
    } else {
      isVisible.value = true;
    }
  }
});

// Javascript hooks for stagger effects if needed
const onBeforeEnter = (el) => {
  if (!props.useJavascript) return;
  el.style.opacity = 0;
};

const onEnter = (el, done) => {
  if (!props.useJavascript) return;
  // Fallback to CSS transitions for actual work, but allowing JS timing
  el.style.transition = `all ${props.duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
  el.offsetHeight; // trigger reflow
  el.style.opacity = 1;
  setTimeout(done, props.duration);
};

const onLeave = (el, done) => {
  if (!props.useJavascript) return;
  el.style.opacity = 0;
  setTimeout(done, props.duration);
};
</script>

<style scoped>
/* Motion CSS Classes */

/* Fade Up */
.motion-fade-up-enter-active,
.motion-fade-up-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-fade-up-enter-from,
.motion-fade-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Fade Down */
.motion-fade-down-enter-active,
.motion-fade-down-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-fade-down-enter-from,
.motion-fade-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Fade Left */
.motion-fade-left-enter-active,
.motion-fade-left-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-fade-left-enter-from,
.motion-fade-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Fade Right */
.motion-fade-right-enter-active,
.motion-fade-right-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-fade-right-enter-from,
.motion-fade-right-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Scale In */
.motion-scale-in-enter-active,
.motion-scale-in-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-scale-in-enter-from,
.motion-scale-in-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Blur In */
.motion-blur-in-enter-active,
.motion-blur-in-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), filter 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.motion-blur-in-enter-from,
.motion-blur-in-leave-to {
  opacity: 0;
  filter: blur(8px);
}
</style>
