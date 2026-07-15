<template>
  <div ref="root" class="li-sparkle">
    <slot />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useParticles } from '../composables/useParticles.js'

const props = defineProps({
  trigger: { type: Boolean, default: null },
  fireOnMount: { type: Boolean, default: false },
  count: { type: Number, default: 5 },
  lifespan: { type: Number, default: 800 },
})
const emit = defineEmits(['fired'])
const root = ref(null)
const { sparkle } = useParticles()

function fire() {
  if (root.value) { sparkle(root.value, { count: props.count, lifespan: props.lifespan }); emit('fired') }
}
watch(() => props.trigger, (v) => { if (v) fire() })
onMounted(() => { if (props.fireOnMount) fire() })
</script>

<style scoped>
.li-sparkle { position: relative; }
</style>
