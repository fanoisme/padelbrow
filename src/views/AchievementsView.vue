<template>
  <section class="achievements-view">
    <LiHero
      v-if="progress"
      variant="warm"
      intensity="subtle"
      eyebrow="Your progress"
      :title="`Level ${progress.level.level} — ${progress.level.title}`"
      :subtitle="heroSubtitle"
    >
      <template #actions>
        <span class="achievements-view__xp"><LiCountUp :end-val="progress.totalXp" />&nbsp;XP</span>
      </template>
      <div class="achievements-view__bar">
        <LiProgress :value="barPct" variant="brand" show-value label="Level progress" />
      </div>
    </LiHero>

    <LiRevealOnScroll variant="fade-up" stagger>
      <div class="achievements-view__grid">
        <LiSparkle
          v-for="a in achievements"
          :key="a.id"
          class="achievement-card__sparkle"
          :fire-on-mount="unlocked.has(a.id)"
          :count="12"
          :lifespan="1000"
        >
          <LiGlassCard
            data-testid="achievement-card"
            class="achievement-card"
            :class="{ 'achievement-card--unlocked': unlocked.has(a.id) }"
            :variant="unlocked.has(a.id) ? 'accent' : 'dark'"
            size="sm"
            :textured="unlocked.has(a.id)"
          >
            <LiBadge :label="a.tier" :variant="tierVariant(a.tier)" />
            <strong class="achievement-card__name">{{ a.name }}</strong>
            <p class="achievement-card__desc">{{ a.description }}</p>
            <span v-if="unlocked.has(a.id)" class="achievement-card__state">
              <LiIcon name="check_circle" size="xs" />Unlocked
            </span>
            <span v-else class="achievement-card__state achievement-card__state--locked">
              <LiIcon name="lock" size="xs" />Locked
            </span>
          </LiGlassCard>
        </LiSparkle>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, LiCountUp, LiGlassCard, LiHero, LiIcon, LiProgress, LiRevealOnScroll, LiSparkle, useToast } from '../design-system/components/index.js'
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

const heroSubtitle = computed(() => {
  if (!progress.value) return ''
  return progress.value.nextLevel
    ? `${progress.value.nextMinXp - progress.value.totalXp} XP to ${progress.value.nextLevel.title}`
    : 'Max level reached'
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
.achievements-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
}

.achievements-view__xp {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-on-surface, #FFFFFF);
  padding: 8px 18px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
}

.achievements-view__bar {
  width: 100%;
  max-width: 420px;
  margin-top: var(--space-m, 12px);
}

.achievements-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-l, 16px);
}

.achievement-card__sparkle {
  min-height: 100%;
}

.achievement-card {
  height: 100%;
  transition: opacity var(--dur-medium, 300ms) var(--ease-smooth, ease),
    box-shadow var(--dur-medium, 300ms) var(--ease-smooth, ease);
}

.achievement-card :deep(.li-glass-card__surface) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs, 4px);
  min-height: 44px;
}

/* Locked: dimmed, muted, no glow */
.achievement-card:not(.achievement-card--unlocked) {
  opacity: 0.55;
}

/* Unlocked: full brightness + brand glow (signature moment alongside the sparkle burst) */
.achievement-card--unlocked {
  opacity: 1;
}

.achievement-card--unlocked :deep(.li-glass-card__surface) {
  box-shadow: var(--shadow-glow-subtle, 0 0 16px rgba(255, 188, 37, 0.12));
}

.achievement-card--unlocked:hover :deep(.li-glass-card__surface) {
  box-shadow: var(--shadow-glow, 0 0 24px rgba(255, 188, 37, 0.25));
}

.achievement-card__name {
  font-size: 1rem;
}

.achievement-card__desc {
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 0;
}

.achievement-card__state {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 44px;
  align-content: center;
}

.achievement-card__state--locked {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .achievements-view__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .achievements-view__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .achievement-card {
    transition: none;
  }
}
</style>
