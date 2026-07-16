<template>
  <section class="stats-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      eyebrow="Personal stats"
      title="My Stats"
      subtitle="Your rating, reliability, and match history."
    >
      <div v-if="stats" class="stats-view__headline">
        <span class="stats-view__headline-label">Current rating</span>
        <p class="stats-view__headline-value">
          <LiGradientText>
            <LiCountUp :end-val="Number(stats.rating)" :decimals="1" :duration="1400" />
          </LiGradientText>
        </p>
      </div>
    </LiHero>

    <LiRevealOnScroll v-if="stats" variant="fade-up" stagger :stagger-delay="70" class="stats-view__tiles">
      <LiGlassCard size="sm" :textured="false" class="stats-view__tile">
        <span class="stats-view__tile-label">Played</span>
        <strong class="stats-view__tile-value"><LiCountUp :end-val="stats.matches_played" :duration="1000" /></strong>
      </LiGlassCard>
      <LiGlassCard size="sm" :textured="false" class="stats-view__tile">
        <span class="stats-view__tile-label">Reliability</span>
        <strong class="stats-view__tile-value"><LiCountUp :end-val="Math.round(stats.reliability_pct)" :duration="1000" suffix="%" /></strong>
      </LiGlassCard>
      <LiGlassCard size="sm" :textured="false" class="stats-view__tile">
        <span class="stats-view__tile-label">Wins</span>
        <strong class="stats-view__tile-value stats-view__tile-value--win"><LiCountUp :end-val="wins" :duration="1000" /></strong>
      </LiGlassCard>
      <LiGlassCard size="sm" :textured="false" class="stats-view__tile">
        <span class="stats-view__tile-label">Losses</span>
        <strong class="stats-view__tile-value"><LiCountUp :end-val="losses" :duration="1000" /></strong>
      </LiGlassCard>
      <LiGlassCard size="sm" :textured="false" class="stats-view__tile">
        <span class="stats-view__tile-label">Win %</span>
        <strong class="stats-view__tile-value"><LiCountUp :end-val="winPct" :duration="1000" suffix="%" /></strong>
      </LiGlassCard>
    </LiRevealOnScroll>

    <h2 class="stats-view__section-title">Match history</h2>
    <LiEmptyState v-if="!history.length" title="No matches yet." icon="history" />
    <LiCard v-else flush class="stats-view__history">
      <LiRevealOnScroll variant="fade-up" stagger :stagger-delay="60" class="stats-view__timeline">
        <div v-for="h in history" :key="h.match.id" class="stats-view__timeline-item">
          <div class="stats-view__timeline-rail" aria-hidden="true">
            <span
              class="stats-view__timeline-dot"
              :class="{
                'stats-view__timeline-dot--win': h.match.status === 'completed' && resultOf(h),
                'stats-view__timeline-dot--loss': h.match.status === 'completed' && !resultOf(h),
              }"
            />
          </div>
          <LiListTile
            class="stats-view__timeline-tile"
            :title="h.match.meet?.title || 'Match'"
            :subtitle="`${h.match.score_a}-${h.match.score_b}`"
          >
            <template #trailing>
              <LiBadge v-if="h.match.status === 'completed'" :label="resultOf(h) ? 'W' : 'L'" :variant="resultOf(h) ? 'success' : 'error'" />
              <LiBadge v-else label="pending" variant="neutral" />
            </template>
          </LiListTile>
        </div>
      </LiRevealOnScroll>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  LiBadge, LiCard, LiCountUp, LiEmptyState, LiGlassCard, LiGradientText,
  LiHero, LiListTile, LiRevealOnScroll, useToast,
} from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useStats } from '../composables/useStats.js'

const toast = useToast()
const { user } = useAuth()
const { getPersonalStats, getPersonalHistory } = useStats()

const stats = ref(null)
const history = ref([])

const completed = computed(() => history.value.filter((h) => h.match.status === 'completed' && h.match.score_a != null && h.match.score_b != null))
const wins = computed(() => completed.value.filter(resultOf).length)
const losses = computed(() => completed.value.length - wins.value)
const winPct = computed(() => (completed.value.length ? Math.round((wins.value / completed.value.length) * 100) : 0))

function resultOf(h) {
  if (!h.match || h.match.score_a == null || h.match.score_b == null) return false
  return h.team === 'a' ? h.match.score_a > h.match.score_b : h.match.score_b > h.match.score_a
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [s, h] = await Promise.all([getPersonalStats(user.value.id), getPersonalHistory(user.value.id)])
    stats.value = s
    history.value = h
  } catch (err) {
    toast.error(err.message || 'Could not load your stats.')
  }
})
</script>

<style scoped>
.stats-view { display: flex; flex-direction: column; gap: var(--space-xl, 24px); }

/* ── Hero headline stat ── */
.stats-view__headline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs, 4px);
  margin-top: var(--space-s, 8px);
}
.stats-view__headline-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-on-surface-variant, #D4D4D4);
}
.stats-view__headline-value {
  margin: 0;
  font-size: clamp(3rem, 10vw, 4.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  text-shadow: var(--shadow-glow);
}

/* ── Glass stat tiles ── */
.stats-view__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-s, 8px);
}
.stats-view__tile :deep(.li-glass-card__surface) {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  min-height: 44px;
}
.stats-view__tile-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
}
.stats-view__tile-value {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-on-surface, #FFFFFF);
}
.stats-view__tile-value--win { color: var(--color-success, #10B981); }

.stats-view__section-title {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
  letter-spacing: -0.01em;
}

/* ── Match history timeline ── */
.stats-view__timeline {
  display: flex;
  flex-direction: column;
}
.stats-view__timeline-item {
  display: flex;
  align-items: stretch;
  gap: var(--space-s, 8px);
}
.stats-view__timeline-rail {
  position: relative;
  width: 20px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}
.stats-view__timeline-rail::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: var(--glass-border, rgba(255, 255, 255, 0.08));
}
.stats-view__timeline-item:first-child .stats-view__timeline-rail::before { top: 50%; }
.stats-view__timeline-item:last-child .stats-view__timeline-rail::before { bottom: 50%; }
.stats-view__timeline-dot {
  position: relative;
  z-index: 1;
  align-self: center;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-on-surface-muted, #B0B0B0);
  box-shadow: 0 0 0 3px var(--color-surface-bright, #141414);
}
.stats-view__timeline-dot--win { background: var(--color-success, #10B981); box-shadow: 0 0 0 3px var(--color-surface-bright, #141414), var(--shadow-glow-success); }
.stats-view__timeline-dot--loss { background: var(--color-error, #C83E3B); box-shadow: 0 0 0 3px var(--color-surface-bright, #141414), var(--shadow-glow-error); }
.stats-view__timeline-tile { flex: 1; min-width: 0; min-height: 44px; }

@media (max-width: 480px) {
  .stats-view__tiles { grid-template-columns: repeat(2, 1fr); }
}
</style>
