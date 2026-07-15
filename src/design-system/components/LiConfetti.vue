<template>
  <!--
    LiConfetti · declarative confetti burst.
    Fires when `trigger` flips to true (or on mount when fire-on-mount). Emits @fired.
  -->
  <div ref="root" class="li-confetti">
    <slot />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useParticles } from '../composables/useParticles.js'

const props = defineProps({
  trigger: { type: Boolean, default: null },
  fireOnMount: { type: Boolean, default: false },
  count: { type: Number, default: 16 },
  lifespan: { type: Number, default: 1200 },
})
const emit = defineEmits(['fired'])
const root = ref(null)
const { confetti } = useParticles()

function fire() {
  if (root.value) { confetti(root.value, { count: props.count, lifespan: props.lifespan }); emit('fired') }
}
watch(() => props.trigger, (v) => { if (v) fire() })
onMounted(() => { if (props.fireOnMount) fire() })
</script>

<style scoped>
.li-confetti { position: relative; }
</style>
