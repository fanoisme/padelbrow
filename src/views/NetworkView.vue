<template>
  <section class="network-view">
    <LiHero
      variant="cool"
      intensity="subtle"
      eyebrow="Your padel circle"
      title="My Network"
      subtitle="Players you follow, and new players to discover."
    />

    <div class="network-view__section">
      <div class="network-view__section-head">
        <h2>Following</h2>
        <LiBadge v-if="followees.length" variant="brand" size="sm" is-pill>{{ followees.length }}</LiBadge>
      </div>

      <LiEmptyState v-if="followees.length === 0" title="You're not following anyone yet" icon="person" />

      <LiRevealOnScroll v-else variant="fade-up" stagger class="player-grid">
        <div
          v-for="person in followees"
          :key="person.id"
          class="player-card-tilt"
          :style="cardTiltStyle(person.id)"
          @mousemove="onCardMove($event, person.id)"
          @mouseleave="onCardLeave(person.id)"
        >
          <LiGlassCard variant="light" size="sm" class="player-card">
            <div class="player-card__body">
              <LiAvatar :initials="initialsOf(person.full_name)" size="lg" />
              <p class="player-card__name">{{ person.full_name }}</p>
            </div>
            <div class="player-card__action">
              <LiButton variant="secondary" size="sm" @click="handleUnfollow(person.id)">Unfollow</LiButton>
            </div>
          </LiGlassCard>
        </div>
      </LiRevealOnScroll>
    </div>

    <div class="network-view__section">
      <h2>Discover players</h2>

      <form data-testid="discovery-form" class="discovery-form" @submit.prevent="handleSearch">
        <LiTextField v-model="searchArea" placeholder="Search by area..." />
        <LiButton type="submit">
          <template #iconLeft><LiIcon name="search" size="sm" /></template>
          Search
        </LiButton>
      </form>

      <LiRevealOnScroll v-if="searchResults.length" variant="fade-up" stagger class="player-grid">
        <div
          v-for="person in searchResults"
          :key="person.id"
          class="player-card-tilt"
          :style="cardTiltStyle(person.id)"
          @mousemove="onCardMove($event, person.id)"
          @mouseleave="onCardLeave(person.id)"
        >
          <LiGlassCard variant="light" size="sm" class="player-card">
            <div class="player-card__body">
              <LiAvatar :initials="initialsOf(person.full_name)" size="lg" />
              <p class="player-card__name">{{ person.full_name }}</p>
              <LiBadge v-if="person.skill_level != null" variant="info" size="sm" is-pill>
                Level {{ person.skill_level }}
              </LiBadge>
            </div>
            <LiSparkle :trigger="justFollowedIds.has(person.id)" class="player-card__action">
              <LiButton
                size="sm"
                :class="{ 'player-card__follow-btn--celebrate': justFollowedIds.has(person.id) }"
                @click="handleFollow(person.id)"
              >
                Follow
              </LiButton>
            </LiSparkle>
          </LiGlassCard>
        </div>
      </LiRevealOnScroll>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  LiButton, LiTextField, LiEmptyState, LiGlassCard, LiAvatar, LiBadge,
  LiIcon, LiHero, LiRevealOnScroll, LiSparkle, useToast, useCursorAwareness,
} from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useFollows } from '../composables/useFollows.js'
import { usePlayerDiscovery } from '../composables/usePlayerDiscovery.js'

const { user } = useAuth()
const { listFollowees, follow, unfollow } = useFollows()
const { searchPlayers } = usePlayerDiscovery()
const toast = useToast()

const followees = ref([])
const searchArea = ref('')
const searchResults = ref([])

onMounted(async () => {
  followees.value = await listFollowees(user.value.id)
})

async function handleSearch() {
  searchResults.value = await searchPlayers({ homeArea: searchArea.value, currentUserId: user.value.id })
}

async function handleFollow(followeeId) {
  try {
    await follow(user.value.id, followeeId)
    followees.value = await listFollowees(user.value.id)
    celebrateFollow(followeeId)
  } catch (err) {
    toast.error(err.message || 'Could not follow that player.')
  }
}

async function handleUnfollow(followeeId) {
  try {
    await unfollow(user.value.id, followeeId)
    followees.value = await listFollowees(user.value.id)
  } catch (err) {
    toast.error(err.message || 'Could not unfollow that player.')
  }
}

// ── Presentational-only: "just followed" sparkle + spring trigger (per-row) ──
const justFollowedIds = reactive(new Set())
function celebrateFollow(id) {
  justFollowedIds.add(id)
  setTimeout(() => justFollowedIds.delete(id), 900)
}

// ── Presentational-only: initials for avatar fallback ──
function initialsOf(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()
}

// ── Presentational-only: desktop cursor tilt on player cards ──
const { tilt } = useCursorAwareness()
const cardTilts = new Map()
function getCardTilt(id) {
  let t = cardTilts.get(id)
  if (!t) {
    t = tilt({ maxDeg: 6 })
    cardTilts.set(id, t)
  }
  return t
}
function onCardMove(e, id) {
  getCardTilt(id).onMove(e, e.currentTarget)
}
function onCardLeave(id) {
  getCardTilt(id).onLeave()
}
function cardTiltStyle(id) {
  return getCardTilt(id).style.value
}
</script>

<style scoped>
.network-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl, 32px);
}

.network-view__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
}

.network-view__section-head {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.network-view__section h2 {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--color-on-surface, #FFFFFF);
}

/* ── Discovery form ── */
.discovery-form {
  display: flex;
  gap: var(--space-s, 8px);
}
.discovery-form :deep(.li-textfield-wrapper) {
  flex: 1;
}

/* ── Player grid ── */
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-l, 16px);
}
@media (max-width: 768px) {
  .player-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Cursor tilt wrapper (desktop-only via useCursorAwareness no-op elsewhere) ── */
.player-card-tilt {
  transition: transform 300ms var(--ease-out, ease);
  transform-style: preserve-3d;
}

.player-card {
  height: 100%;
}

.player-card :deep(.li-glass-card__surface) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-m, 12px);
  text-align: center;
  height: 100%;
}

.player-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s, 8px);
}

.player-card__name {
  margin: 0;
  font-size: var(--text-sm, 14px);
  font-weight: 700;
  color: var(--color-on-surface, #FFFFFF);
}

.player-card__action {
  margin-top: auto;
  display: flex;
  justify-content: center;
}

.player-card__action :deep(.li-btn) {
  min-height: 44px;
  min-width: 44px;
}

/* ── Follow signature moment: spring bounce (paired with LiSparkle burst) ── */
@keyframes network-follow-spring {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.18); }
  60%  { transform: scale(0.94); }
  100% { transform: scale(1); }
}

.player-card__action :deep(.player-card__follow-btn--celebrate) {
  animation: network-follow-spring 550ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}

@media (prefers-reduced-motion: reduce) {
  .player-card-tilt {
    transition: none;
    transform: none !important;
  }
  .player-card__action :deep(.player-card__follow-btn--celebrate) {
    animation: none;
  }
}
</style>
