<template>
  <section class="challenges-view">
    <h1>Challenges</h1>
    <ul class="challenges-view__list">
      <li v-for="c in challenges" :key="c.id" class="challenge-card">
        <div class="challenge-card__head">
          <strong>{{ c.title }}</strong>
          <LiBadge :label="c.period" variant="info" />
          <span class="challenge-card__reward">+{{ c.xp_reward }} XP</span>
        </div>
        <p>{{ c.description }}</p>
        <div class="challenge-card__bar">
          <div class="challenge-card__bar-fill" :style="{ width: pctOf(c) + '%' }"></div>
        </div>
        <span class="challenge-card__progress">{{ progressOf(c) }} / {{ targetOf(c) }}</span>
      </li>
      <li v-if="!challenges.length" class="challenges-view__empty">No active challenges.</li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiBadge, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useGamification } from '../composables/useGamification.js'
import { useStats } from '../composables/useStats.js'

const toast = useToast()
const { user } = useAuth()
const { getActiveChallenges } = useGamification()
const { getPersonalHistory } = useStats()

const challenges = ref([])
const history = ref([])

function inWindow(c, createdAt) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return t >= new Date(c.starts_at).getTime() && t <= new Date(c.ends_at).getTime()
}
function wonMatch(h) {
  if (!h.match || h.match.score_a == null || h.match.score_b == null) return false
  return h.team === 'a' ? h.match.score_a > h.match.score_b : h.match.score_b > h.match.score_a
}
function targetOf(c) {
  return Number(c.target_criteria?.count) || 0
}
function progressOf(c) {
  const type = c.target_criteria?.type
  return history.value.filter((h) =>
    h.match?.status === 'completed' &&
    inWindow(c, h.match.created_at) &&
    (type === 'meet_won' ? wonMatch(h) : true),
  ).length
}
function pctOf(c) {
  const t = targetOf(c)
  return t > 0 ? Math.min(100, Math.round((progressOf(c) / t) * 100)) : 0
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [c, h] = await Promise.all([getActiveChallenges(), getPersonalHistory(user.value.id)])
    challenges.value = c
    history.value = h
  } catch (err) {
    toast.error(err.message || 'Could not load challenges.')
  }
})
</script>

<style scoped>
.challenges-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.challenges-view__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.challenge-card { display: flex; flex-direction: column; gap: var(--space-xs, 4px); padding: var(--space-m, 16px); background: var(--color-surface, #fff); border-radius: var(--radius-m, 12px); }
.challenge-card__head { display: flex; align-items: center; gap: var(--space-s, 8px); }
.challenge-card__reward { margin-left: auto; font-weight: 600; }
.challenge-card__bar { height: 8px; background: var(--color-gray-200, #E6E6E6); border-radius: 999px; overflow: hidden; }
.challenge-card__bar-fill { height: 100%; background: var(--color-brand, #4f46e5); transition: width 0.3s; }
.challenge-card__progress { font-size: 0.85rem; opacity: 0.7; }
.challenges-view__empty { opacity: 0.6; }
</style>
