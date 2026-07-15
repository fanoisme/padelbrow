<template>
  <section class="achievements-view">
    <LiPageHeader v-if="progress" :title="`Level ${progress.level.level} — ${progress.level.title}`">
      <template #actions>
        <span class="achievements-view__xp"><LiCountUp :end-val="progress.totalXp" />&nbsp;XP</span>
      </template>
    </LiPageHeader>

    <div v-if="progress" class="achievements-view__head">
      <LiProgress :value="barPct" variant="brand" />
      <p v-if="progress.nextLevel" class="achievements-view__next">
        {{ progress.nextMinXp - progress.totalXp }} XP to {{ progress.nextLevel.title }}
      </p>
      <p v-else class="achievements-view__next">Max level reached</p>
    </div>

    <LiRevealOnScroll variant="fade-up" stagger>
      <div class="achievements-view__grid">
        <LiCard
          v-for="a in achievements"
          :key="a.id"
          data-testid="achievement-card"
          class="achievement-card"
          :class="{ 'achievement-card--unlocked': unlocked.has(a.id) }"
        >
          <LiBadge :label="a.tier" :variant="tierVariant(a.tier)" />
          <strong>{{ a.name }}</strong>
          <p>{{ a.description }}</p>
          <span v-if="unlocked.has(a.id)" class="achievement-card__state">Unlocked</span>
          <span v-else class="achievement-card__state achievement-card__state--locked">Locked</span>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, LiCard, LiCountUp, LiPageHeader, LiProgress, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useGamification } from '../composables/useGamification.js'

const toast = useToast()
const { user } = useAuth()
const { getMyProgress, getAchievements, getMyUnlocked } = useGamification()

const progress = ref(null)
const achievements = ref([])
const unlocked = ref(new Set())

const barPct = computed(() => {
  if (!progress.value || !progress.value.nextMinXp) return 100
  const span = progress.value.nextMinXp - progress.value.level.min_xp
  const done = progress.value.totalXp - progress.value.level.min_xp
  return span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100
})

function tierVariant(tier) {
  if (tier === 'platinum') return 'info'
  if (tier === 'gold') return 'warning'
  if (tier === 'silver') return 'neutral'
  return 'brand'
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [p, a, u] = await Promise.all([
      getMyProgress(user.value.id),
      getAchievements(),
      getMyUnlocked(user.value.id),
    ])
    progress.value = p
    achievements.value = a
    unlocked.value = u
  } catch (err) {
    toast.error(err.message || 'Could not load achievements.')
  }
})
</script>

<style scoped>
.achievements-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.achievements-view__xp { font-weight: 700; font-size: 1.1rem; color: var(--color-on-surface, #333333); }
.achievements-view__head { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.achievements-view__next { font-size: 0.85rem; opacity: 0.7; }
.achievements-view__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-s, 8px); }
.achievement-card { opacity: 0.5; border: 2px solid transparent; }
.achievement-card :deep(.li-card__body) { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.achievement-card--unlocked { opacity: 1; border-color: var(--color-brand, #FFAF03); box-shadow: var(--shadow-glow, 0 0 24px rgba(255, 188, 37, 0.25)); }
.achievement-card__state { font-size: 0.8rem; font-weight: 600; }
.achievement-card__state--locked { opacity: 0.5; }
</style>
