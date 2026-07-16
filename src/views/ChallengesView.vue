<template>
  <section class="challenges-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      eyebrow="Gamification"
      title="Challenges"
      subtitle="Complete active challenges to earn bonus XP."
    />

    <LiEmptyState v-if="!challenges.length" title="No active challenges." icon="target" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="challenges-view__list">
        <LiGlassCard
          v-for="c in challenges"
          :key="c.id"
          class="challenge-card"
          variant="dark"
          :hoverable="true"
          v-bind="tiltHandlers(c.id)"
        >
          <div class="challenge-card__head">
            <strong class="challenge-card__title">{{ c.title }}</strong>
            <LiBadge :label="c.period" variant="info" />
          </div>
          <p class="challenge-card__desc">{{ c.description }}</p>

          <div class="challenge-card__body">
            <div class="challenge-card__ring-wrap">
              <svg class="challenge-card__ring" viewBox="0 0 80 80" aria-hidden="true">
                <circle class="challenge-card__ring-track" cx="40" cy="40" r="34" />
                <circle
                  class="challenge-card__ring-fill"
                  cx="40" cy="40" r="34"
                  :style="{ strokeDasharray: ringCircumference, strokeDashoffset: ringOffset(c) }"
                />
              </svg>
              <span class="challenge-card__ring-label">{{ pctOf(c) }}%</span>
            </div>

            <div class="challenge-card__meta">
              <span class="challenge-card__progress">
                <strong>{{ progressOf(c) }}</strong> / {{ targetOf(c) }}
              </span>
              <span class="challenge-card__reward">
                <LiIcon name="bolt" size="sm" />
                +{{ c.xp_reward }} XP
              </span>
              <span class="challenge-card__countdown" :class="{ 'challenge-card__countdown--ended': isEnded(c) }">
                <LiIcon name="schedule" size="sm" />
                {{ countdownLabel(c) }}
              </span>
            </div>
          </div>
        </LiGlassCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { LiBadge, LiEmptyState, LiGlassCard, LiHero, LiIcon, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useGamification } from '../composables/useGamification.js'
import { useStats } from '../composables/useStats.js'
import { useCursorAwareness } from '../design-system/composables/useCursorAwareness.js'

const toast = useToast()
const { user } = useAuth()
const { getActiveChallenges } = useGamification()
const { getPersonalHistory } = useStats()
const { tilt } = useCursorAwareness()

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

// ── Presentational-only additions: ring dash-offset + countdown + hover tilt ──
const ringRadius = 34
const ringCircumference = 2 * Math.PI * ringRadius

function ringOffset(c) {
  const pct = pctOf(c)
  return ringCircumference * (1 - pct / 100)
}

function isEnded(c) {
  if (!c.ends_at) return false
  return new Date(c.ends_at).getTime() < Date.now()
}

function countdownLabel(c) {
  if (!c.ends_at) return ''
  const diffMs = new Date(c.ends_at).getTime() - Date.now()
  if (diffMs <= 0) return 'Ended'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'Ending soon'
  if (hours < 24) return `${hours}h left`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} left`
}

// Per-card tilt handlers (desktop-only, gated by useCursorAwareness on pointer/motion prefs)
const tiltState = reactive({})
function tiltHandlers(id) {
  if (!tiltState[id]) tiltState[id] = tilt({ maxDeg: 4 })
  const t = tiltState[id]
  return {
    style: t.style.value,
    onMousemove: (e) => t.onMove(e, e.currentTarget),
    onMouseleave: () => t.onLeave(),
  }
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
.challenges-view__list { display: flex; flex-direction: column; gap: var(--space-l, 16px); }

.challenge-card { display: block; }
.challenge-card :deep(.li-glass-card__surface) {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}

.challenge-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
  flex-wrap: wrap;
}
.challenge-card__title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-on-surface);
}
.challenge-card__desc {
  margin: 0;
  color: var(--color-on-surface-variant);
  font-size: 0.9rem;
  line-height: 1.5;
}

.challenge-card__body {
  display: flex;
  align-items: center;
  gap: var(--space-l, 16px);
  flex-wrap: wrap;
}

/* ── Progress ring — signature moment ── */
.challenge-card__ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.challenge-card__ring {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 8px rgba(255, 175, 3, 0.25));
}
.challenge-card__ring-track {
  fill: none;
  stroke: var(--color-outline);
  stroke-width: 7;
}
.challenge-card__ring-fill {
  fill: none;
  stroke: var(--color-brand);
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--dur-long, 500ms) var(--ease-smooth);
}
.challenge-card__ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-on-surface);
}

.challenge-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.challenge-card__progress {
  font-size: 0.9rem;
  color: var(--color-on-surface-variant);
}
.challenge-card__progress strong {
  color: var(--color-on-surface);
  font-weight: 800;
}
.challenge-card__reward,
.challenge-card__countdown {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
}
.challenge-card__reward { color: var(--color-brand); }
.challenge-card__countdown--ended { color: var(--li-text-muted); }

@media (max-width: 768px) {
  .challenge-card__body { gap: var(--space-m, 12px); }
  .challenge-card__ring-wrap { width: 64px; height: 64px; }
  .challenge-card__ring { width: 64px; height: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .challenge-card__ring-fill { transition: none; }
}
</style>
