<template>
  <section class="comps-list-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      eyebrow="Compete"
      title="Competitions"
      subtitle="Round-robin leagues and knockout brackets."
    >
      <template #actions>
        <LiMagneticButton variant="primary" icon="add" @click="$router.push('/competitions/new')">
          Create competition
        </LiMagneticButton>
      </template>
    </LiHero>

    <LiEmptyState v-if="competitions.length === 0" title="No competitions yet" icon="trophy" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="comps-list-view__list">
        <LiGlassCard
          v-for="comp in competitions"
          :key="comp.id"
          class="comps-list-view__card"
          variant="light"
          hoverable
        >
          <router-link
            :to="`/competitions/${comp.id}`"
            class="comps-list-view__link"
            @mousemove="onCardMove($event, comp.id)"
            @mouseleave="onCardLeave(comp.id)"
            :style="cardTiltStyle(comp.id)"
          >
            <h3 class="comps-list-view__name">{{ comp.name }}</h3>
            <div class="comps-list-view__meta">
              <LiBadge :label="formatLabel(comp.format)" variant="neutral" is-pill size="sm" />
              <LiBadge
                :label="statusLabel(comp.status)"
                :variant="statusVariant(comp.status)"
                is-pill
                size="sm"
                :class="statusGlowClass(comp.status)"
              />
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
  LiBadge,
  LiEmptyState,
  LiGlassCard,
  LiHero,
  LiMagneticButton,
  LiRevealOnScroll,
  useCursorAwareness,
  useToast,
} from '../../design-system/components/index.js'
import { useCompetitions } from '../../composables/useCompetitions.js'

const { listCompetitions } = useCompetitions()
const toast = useToast()
const competitions = ref([])
const { tilt } = useCursorAwareness()

// Each card gets its own tilt state (lazily created) so hover physics don't
// bleed between cards in the v-for.
const cardTilts = new Map()
function getCardTilt(id) {
  if (!cardTilts.has(id)) cardTilts.set(id, tilt({ maxDeg: 4 }))
  return cardTilts.get(id)
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

onMounted(async () => {
  try {
    competitions.value = await listCompetitions()
  } catch (err) {
    toast.error(err.message || 'Could not load competitions.')
  }
})

const FORMAT_LABELS = {
  round_robin: 'Round robin',
  single_elim: 'Single elimination',
}
function formatLabel(format) {
  if (!format) return 'Format TBD'
  return FORMAT_LABELS[format] || format.replace(/_/g, ' ')
}

const STATUS_LABELS = {
  draft: 'Draft',
  registration_open: 'Registration open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
function statusLabel(status) {
  if (!status) return 'Unknown'
  return STATUS_LABELS[status] || status.replace(/_/g, ' ')
}

// Mirrors CompetitionDetailView's statusVariant mapping for visual consistency.
function statusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  if (status === 'registration_open') return 'brand'
  return 'neutral'
}

// Signature moment: the status chip glows while the competition is active,
// brighter for the "come join now" registration window than for a running event.
function statusGlowClass(status) {
  if (status === 'registration_open') return 'comps-list-view__status--glow-open'
  if (status === 'in_progress') return 'comps-list-view__status--glow-live'
  return ''
}
</script>

<style scoped>
.comps-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl, 24px);
}

.comps-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-l, 16px);
}

.comps-list-view__card {
  width: 100%;
}

.comps-list-view__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
  min-height: 44px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-medium, 300ms) var(--ease-smooth, ease);
  will-change: transform;
}

.comps-list-view__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-on-surface, inherit);
  letter-spacing: -0.01em;
}

.comps-list-view__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-s, 8px);
}

/* ── Status glow — the signature moment for this view ── */
.comps-list-view__status--glow-open {
  box-shadow: var(--shadow-glow-pulse, 0 0 24px rgba(255, 188, 37, 0.3));
  animation: lith-glow-pulse 2.4s var(--ease-smooth, ease) infinite;
}

.comps-list-view__status--glow-live {
  box-shadow: var(--shadow-glow-info, 0 0 16px rgba(37, 99, 235, 0.2));
}

@media (max-width: 768px) {
  .comps-list-view__list {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comps-list-view__link {
    transition: none;
  }
  .comps-list-view__status--glow-open {
    animation: none;
  }
}
</style>
