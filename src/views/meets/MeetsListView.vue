<template>
  <section class="meets-list-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      eyebrow="Padel socials"
      title="Meets"
      subtitle="Book a social match or join one nearby."
    >
      <template #actions>
        <LiMagneticButton variant="primary" icon="add" @click="$router.push('/meets/new')">
          Create meet
        </LiMagneticButton>
      </template>
    </LiHero>

    <LiEmptyState v-if="meets.length === 0" title="No upcoming meets" icon="event" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="meets-list-view__list">
        <LiGlassCard
          v-for="meet in meets"
          :key="meet.id"
          class="meets-list-view__card"
          variant="light"
          hoverable
        >
          <router-link
            :to="`/meets/${meet.id}`"
            class="meets-list-view__link"
            @mousemove="onCardMove($event, meet.id)"
            @mouseleave="onCardLeave(meet.id)"
            :style="cardTiltStyle(meet.id)"
          >
            <div class="meets-list-view__top">
              <LiAvatar size="md" :style="hostAvatarStyle(meet)" alt="Host" />
              <div class="meets-list-view__heading">
                <h3 class="meets-list-view__title">{{ meet.title }}</h3>
                <p class="meets-list-view__meta">{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
              </div>
            </div>

            <LiBadge
              v-if="meet.format"
              :label="formatLabel(meet.format)"
              variant="brand"
              is-pill
              size="sm"
              class="meets-list-view__format"
            />

            <div class="meets-list-view__fill">
              <LiProgress :value="fillPct(meet)" variant="brand" label="Players joined" />
              <span class="meets-list-view__fill-count">{{ confirmedCount(meet) }}/{{ meet.max_players || '—' }}</span>
            </div>
          </router-link>
        </LiGlassCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  LiAvatar, LiBadge, LiEmptyState, LiGlassCard, LiHero, LiMagneticButton,
  LiProgress, LiRevealOnScroll, useCursorAwareness, useToast,
} from '../../design-system/components/index.js'
import { useMeets } from '../../composables/useMeets.js'

const { listMeets } = useMeets()
const toast = useToast()
const meets = ref([])

const { tilt } = useCursorAwareness()
const cardTilts = new Map()
function getCardTilt(id) {
  if (!cardTilts.has(id)) cardTilts.set(id, tilt({ maxDeg: 4 }))
  return cardTilts.get(id)
}
function onCardMove(e, id) { getCardTilt(id).onMove(e, e.currentTarget) }
function onCardLeave(id) { getCardTilt(id).onLeave() }
function cardTiltStyle(id) { return getCardTilt(id).style.value }

onMounted(async () => {
  try {
    meets.value = await listMeets()
  } catch (err) {
    toast.error(err.message || 'Could not load meets.')
  }
})

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const FORMAT_LABELS = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  team_mexicano: 'Team Mexicano',
  singles: 'Singles',
  social: 'Social',
}
function formatLabel(format) { return FORMAT_LABELS[format] || format }

function confirmedCount(meet) { return meet.meet_participants?.[0]?.count ?? 0 }
function fillPct(meet) {
  const max = meet.max_players || 0
  if (!max) return 0
  return Math.min(100, Math.round((confirmedCount(meet) / max) * 100))
}

// Deterministic hue from the host id so avatar tints are distinct without extra data.
function hostAvatarStyle(meet) {
  const id = meet.creator_id || meet.id
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360
  return { background: `hsl(${h}, 55%, 45%)` }
}
</script>

<style scoped>
.meets-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
}

.meets-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-m, 12px);
}

.meets-list-view__card {
  transition: transform var(--dur-medium, 300ms) var(--ease-smooth);
}

.meets-list-view__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
  color: inherit;
  text-decoration: none;
}

.meets-list-view__top {
  display: flex;
  align-items: center;
  gap: var(--space-m, 12px);
}

.meets-list-view__heading {
  min-width: 0;
}

.meets-list-view__title {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 700;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meets-list-view__meta {
  margin: 2px 0 0;
  font-size: var(--text-sm, 14px);
  color: var(--color-on-surface-variant);
}

.meets-list-view__format {
  align-self: flex-start;
}

.meets-list-view__fill {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.meets-list-view__fill :deep(.li-progress) {
  flex: 1;
}

.meets-list-view__fill-count {
  font-size: var(--text-xs, 13px);
  font-weight: 700;
  color: var(--color-on-surface-variant);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
