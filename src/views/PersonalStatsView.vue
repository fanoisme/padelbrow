<template>
  <section class="stats-view">
    <LiPageHeader title="My stats" subtitle="Your rating, reliability, and match history." />

    <div v-if="stats" class="stats-view__card">
      <LiCard class="stats-view__tile"><span>Rating</span><strong>{{ Number(stats.rating).toFixed(1) }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Played</span><strong>{{ stats.matches_played }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Reliability</span><strong>{{ Math.round(stats.reliability_pct) }}%</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Wins</span><strong>{{ wins }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Losses</span><strong>{{ losses }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Win %</span><strong>{{ winPct }}%</strong></LiCard>
    </div>

    <h2>Match history</h2>
    <LiEmptyState v-if="!history.length" title="No matches yet." icon="history" />
    <LiCard v-else flush>
      <LiListTile
        v-for="h in history"
        :key="h.match.id"
        :title="h.match.meet?.title || 'Match'"
        :subtitle="`${h.match.score_a}-${h.match.score_b}`"
      >
        <template #trailing>
          <LiBadge v-if="h.match.status === 'completed'" :label="resultOf(h) ? 'W' : 'L'" :variant="resultOf(h) ? 'success' : 'error'" />
          <LiBadge v-else label="pending" variant="neutral" />
        </template>
      </LiListTile>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, LiCard, LiEmptyState, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
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
.stats-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.stats-view__card { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-s, 8px); }
.stats-view__tile :deep(.li-card__body) { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.stats-view__tile span { font-size: 0.8rem; opacity: 0.6; }
</style>
