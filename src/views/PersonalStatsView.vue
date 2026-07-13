<template>
  <section class="stats-view">
    <h1>My stats</h1>

    <div class="stats-view__card" v-if="stats">
      <div><span>Rating</span><strong>{{ Number(stats.rating).toFixed(1) }}</strong></div>
      <div><span>Played</span><strong>{{ stats.matches_played }}</strong></div>
      <div><span>Reliability</span><strong>{{ Math.round(stats.reliability_pct) }}%</strong></div>
      <div><span>Wins</span><strong>{{ wins }}</strong></div>
      <div><span>Losses</span><strong>{{ losses }}</strong></div>
      <div><span>Win %</span><strong>{{ winPct }}%</strong></div>
    </div>

    <h2>Match history</h2>
    <ul class="stats-view__history">
      <li v-for="h in history" :key="h.match.id" class="stats-view__match">
        <span class="stats-view__title">{{ h.match.meet?.title || 'Match' }}</span>
        <span class="stats-view__score">{{ h.match.score_a }}-{{ h.match.score_b }}</span>
        <LiBadge v-if="h.match.status === 'completed'" :label="resultOf(h) ? 'W' : 'L'" :variant="resultOf(h) ? 'success' : 'danger'" />
        <LiBadge v-else label="pending" variant="neutral" />
      </li>
      <li v-if="!history.length" class="stats-view__empty">No matches yet.</li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, useToast } from '../design-system/components/index.js'
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
.stats-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.stats-view__card { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-s, 8px); }
.stats-view__card > div { display: flex; flex-direction: column; gap: var(--space-xs, 4px); padding: var(--space-s, 8px); background: var(--color-surface, #fff); border-radius: var(--radius-s, 6px); }
.stats-view__card span { font-size: 0.8rem; opacity: 0.6; }
.stats-view__history { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.stats-view__match { display: flex; align-items: center; gap: var(--space-s, 8px); }
.stats-view__title { flex: 1; }
.stats-view__score { font-variant-numeric: tabular-nums; }
</style>
