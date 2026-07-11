<template>
  <div 
    class="li-ripple-container" 
    ref="container" 
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRipple } from '../composables/useRipple';

const container = ref(null);
const { addRipple } = useRipple();

const handleMouseDown = (e) => {
  addRipple(e, container.value);
};

const handleTouchStart = (e) => {
  if (e.touches.length > 0) {
    addRipple(e.touches[0], container.value);
  }
};
</script>

<style scoped>
.li-ripple-container {
  position: relative;
  overflow: hidden;
  display: inline-block;
  border-radius: inherit;
}
</style>
