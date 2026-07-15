<template>
  <!--
    LiHero · immersive page hero (Design Guide §1B/§3/§5.5).
    Mandatory LiMeshBackground + reveal cascade + gradient title + desktop spotlight.
    variant maps to LiMeshBackground variants: warm | cool | dark.
  -->
  <section class="li-hero" :class="`li-hero--${variant}`" @mousemove="onSpotlight">
    <LiMeshBackground :variant="variant" :intensity="intensity" />
    <div class="li-hero__spotlight" aria-hidden="true" :style="spotlightStyle" />
    <div class="li-hero__inner">
      <LiRevealOnScroll variant="fade-down" :duration="500">
        <span v-if="eyebrow" class="li-hero__eyebrow">{{ eyebrow }}</span>
      </LiRevealOnScroll>
      <LiRevealOnScroll variant="fade-up" :delay="80" :duration="700">
        <h1 class="li-hero__title"><LiGradientText>{{ title }}</LiGradientText></h1>
      </LiRevealOnScroll>
      <LiRevealOnScroll v-if="subtitle" variant="fade-up" :delay="160" :duration="700">
        <p class="li-hero__subtitle">{{ subtitle }}</p>
      </LiRevealOnScroll>
      <LiRevealOnScroll v-if="$slots.actions" variant="fade-up" :delay="240" :duration="700">
        <div class="li-hero__actions"><slot name="actions" /></div>
      </LiRevealOnScroll>
      <slot />
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import LiMeshBackground from './LiMeshBackground.vue'
import LiRevealOnScroll from './LiRevealOnScroll.vue'
import LiGradientText from './LiGradientText.vue'
import { useCursorAwareness } from '../composables/useCursorAwareness.js'

const props = defineProps({
  variant: { type: String, default: 'warm', validator: (v) => ['warm', 'cool', 'dark'].includes(v) },
  intensity: { type: String, default: 'medium', validator: (v) => ['subtle', 'medium', 'vivid'].includes(v) },
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})

const { enabled } = useCursorAwareness()
const sx = ref(50)
const sy = ref(0)
const spotlightStyle = computed(() => ({
  opacity: enabled.value ? 1 : 0,
  background: `radial-gradient(200px circle at ${sx.value}% ${sy.value}%, var(--spotlight-color, rgba(255,188,37,0.05)), transparent 70%)`,
}))
function onSpotlight(e) {
  if (!enabled.value) return
  const r = e.currentTarget.getBoundingClientRect()
  sx.value = ((e.clientX - r.left) / r.width) * 100
  sy.value = ((e.clientY - r.top) / r.height) * 100
}
</script>

<style scoped>
.li-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-3xl, 64px);
  padding: var(--space-5xl, 96px) var(--space-2xl, 32px);
  margin-bottom: var(--space-3xl, 48px);
  isolation: isolate;
}
.li-hero__spotlight { position: absolute; inset: 0; z-index: 1; pointer-events: none; transition: opacity var(--dur-medium, 300ms) var(--ease-out, ease); }
.li-hero__inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-l, 16px); margin: 0 auto; max-width: 820px; }
.li-hero__eyebrow {
  display: inline-block; padding: 6px 14px; border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255,255,255,0.35)); border: 1px solid var(--glass-border, rgba(255,255,255,0.12));
  font-size: 0.8rem; font-weight: 600; color: var(--color-on-surface-variant, #666); letter-spacing: 0.02em;
}
.li-hero__title { font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; margin: 0; }
.li-hero__subtitle { font-size: clamp(1rem, 2vw, 1.25rem); color: var(--color-on-surface-variant, #666); max-width: 560px; margin: 0; }
.li-hero__actions { display: flex; flex-wrap: wrap; gap: var(--space-m, 12px); justify-content: center; margin-top: var(--space-s, 8px); }
@media (max-width: 768px) { .li-hero { padding: var(--space-3xl, 48px) var(--space-l, 16px); border-radius: var(--radius-xl, 32px); } }
</style>
