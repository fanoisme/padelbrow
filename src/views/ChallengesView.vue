<template>
  <section class="challenges-view">
    <LiPageHeader title="Challenges" subtitle="Complete active challenges to earn bonus XP." />

    <LiEmptyState v-if="!challenges.length" title="No active challenges." icon="target" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="challenges-view__list">
        <LiCard v-for="c in challenges" :key="c.id" class="challenge-card">
          <div class="challenge-card__head">
            <strong>{{ c.title }}</strong>
            <LiBadge :label="c.period" variant="info" />
            <span class="challenge-card__reward">+{{ c.xp_reward }} XP</span>
          </div>
          <p>{{ c.description }}</p>
          <LiProgress :value="pctOf(c)" variant="brand" />
          <span class="challenge-card__progress">{{ progressOf(c) }} / {{ targetOf(c) }}</span>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiBadge, LiCard, LiEmptyState, LiPageHeader, LiProgress, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
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
.challenges-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.challenges-view__list { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.challenge-card { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.challenge-card__head { display: flex; align-items: center; gap: var(--space-s, 8px); }
.challenge-card__reward { margin-left: auto; font-weight: 600; }
.challenge-card__progress { font-size: 0.85rem; opacity: 0.7; }
</style>
