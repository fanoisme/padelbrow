<template>
  <section v-if="meet" class="meet-detail-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      :eyebrow="meet.venue_name || 'Venue TBD'"
      :title="meet.title"
      :subtitle="formatWhen(meet.starts_at)"
    >
      <template #actions>
        <LiConfetti :trigger="confettiTrigger" :count="18" :lifespan="1000">
          <LiMagneticButton v-if="myParticipation === 'none'" variant="primary" @click="handleJoin">Join</LiMagneticButton>
          <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
          <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
        </LiConfetti>
      </template>
    </LiHero>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiGlassCard variant="light" size="md">
          <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
          <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
          <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
        </LiGlassCard>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <div class="meet-detail-view__avatar-stack" aria-hidden="true">
          <LiAvatar
            v-for="p in participants.slice(0, 8)"
            :key="p.id"
            size="sm"
            :initials="participantInitials(p)"
            class="meet-detail-view__avatar-stack-item"
          />
        </div>
        <LiButton v-if="isOrganizer" variant="secondary" size="sm" @click="openAddPlayer">+ Add player</LiButton>
        <LiCard flush>
          <LiListTile v-for="p in participants" :key="p.id" :title="p.profiles?.full_name || p.guest_name">
            <template #leading>
              <LiAvatar size="sm" :initials="participantInitials(p)" />
            </template>
            <template #trailing>
              <LiBadge v-if="!p.user_id" label="Guest" variant="neutral" />
              <LiBadge v-else :label="p.status" :variant="statusVariant(p.status)" />
              <button
                v-if="isOrganizer"
                type="button"
                class="participant-remove"
                aria-label="Remove participant"
                data-testid="remove-participant-btn"
                @click="handleRemoveParticipant(p.id)"
              >
                <LiIcon name="close" size="sm" />
              </button>
            </template>
          </LiListTile>
        </LiCard>
      </div>

      <!-- Payments -->
      <div v-show="activeTab === 2">
        <ExpensesPanel :meet-id="meet.id" :is-organizer="isOrganizer" />
        <PaymentsPanel :meet-id="meet.id" :is-organizer="isOrganizer" :fee-amount="meet.fee_amount" />
      </div>

      <!-- Matches -->
      <div v-show="activeTab === 3" class="meet-detail-view__matches">
        <div class="meet-detail-view__matches-actions">
          <LiMagneticButton variant="secondary" @click="goToMatches">{{ sessions.length ? 'Open match session' : '+ New match session' }}</LiMagneticButton>
          <LiButton v-if="sessions.length" variant="ghost" size="sm" @click="startNewSession">+ Start another session</LiButton>
        </div>
        <LiCard v-if="sessions.length" flush>
          <LiListTile
            v-for="s in sessions"
            :key="s.id"
            :title="formatLabel(s.format)"
            :subtitle="`${s.num_courts} court${s.num_courts === 1 ? '' : 's'} · ${formatDate(s.created_at)}`"
            interactive
            @click="openSession(s.id)"
          >
            <template #trailing>
              <LiBadge :label="sessionStatusLabel(s.status)" :variant="sessionStatusVariant(s.status)" />
            </template>
          </LiListTile>
        </LiCard>
        <LiEmptyState v-else title="Ready to play?" description="Start a live match session to generate rounds and track scores." icon="trophy">
          <template #action>
            <LiMagneticButton @click="goToMatches">Open match session</LiMagneticButton>
          </template>
        </LiEmptyState>
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 4">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>

    <LiBottomSheet v-model="showAddPlayer" title="Add player">
      <div class="add-player-sheet">
        <section v-if="meet.club_id">
          <h4 class="add-player-sheet__label">Club members</h4>
          <LiSpinner v-if="loadingClubMembers" data-testid="add-player-loading" size="sm" inline label="Loading club members…" />
          <template v-else>
            <LiListTile
              v-for="m in clubMembersToAdd"
              :key="m.id"
              :title="m.full_name"
              data-testid="add-player-member"
              interactive
              @click="handleAddExistingMember(m.id)"
            >
              <template #trailing><LiIcon name="add" size="sm" /></template>
            </LiListTile>
            <p v-if="!clubMembersToAdd.length" class="add-player-sheet__empty">No club members left to add.</p>
          </template>
        </section>

        <section class="add-player-sheet__guest">
          <h4 class="add-player-sheet__label">Add a guest</h4>
          <LiTextField v-model="guestName" placeholder="Guest name" data-testid="guest-name-input" />
          <LiButton :disabled="!guestName.trim()" data-testid="add-guest-btn" @click="handleAddGuest">Add guest</LiButton>
        </section>
      </div>
    </LiBottomSheet>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiBottomSheet, LiTextField,
  LiIcon, LiSpinner, LiHero, LiGlassCard, LiMagneticButton, LiConfetti, LiAvatar, useToast,
} from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import MeetChat from '../../components/meets/MeetChat.vue'
import ExpensesPanel from '../../components/payments/ExpensesPanel.vue'
import PaymentsPanel from '../../components/payments/PaymentsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getMeet } = useMeets()
const { listParticipants, joinMeet, leaveMeet, addExistingMember, addGuest, listClubMembersNotInMeet, removeParticipant } = useMeetParticipants()
const { listSessionsByMeet } = useMatchSessions()
const toast = useToast()

const showAddPlayer = ref(false)
const clubMembersToAdd = ref([])
const loadingClubMembers = ref(false)
const guestName = ref('')
const confettiTrigger = ref(false)

const meet = ref(null)
const participants = ref([])
const sessions = ref([])
const activeTab = ref(0)
const tabs = [
  { label: 'Details' },
  { label: 'Participants' },
  { label: 'Payments' },
  { label: 'Matches' },
  { label: 'Chat' },
]

const myParticipation = computed(() => {
  const mine = participants.value.find((p) => p.user_id === user.value?.id)
  if (!mine) return 'none'
  return mine.status
})

const isOrganizer = computed(() => meet.value?.creator_id === user.value?.id)

async function reloadParticipants() {
  participants.value = await listParticipants(route.params.id)
}

async function reloadSessions() {
  try {
    sessions.value = await listSessionsByMeet(route.params.id)
  } catch {
    sessions.value = []
  }
}

onMounted(async () => {
  try {
    meet.value = await getMeet(route.params.id)
    await reloadParticipants()
    await reloadSessions()
  } catch (err) {
    toast.error(err.message || 'Could not load this meet.')
  }
})

async function handleJoin() {
  try {
    await joinMeet(meet.value, user.value.id)
    await reloadParticipants()
    confettiTrigger.value = !confettiTrigger.value
  } catch (err) {
    toast.error(err.message || 'Could not join the meet.')
  }
}

async function handleLeave() {
  try {
    await leaveMeet(route.params.id, user.value.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not leave the meet.')
  }
}

function statusVariant(status) {
  if (status === 'confirmed') return 'success'
  if (status === 'waitlisted') return 'warning'
  if (status === 'invited') return 'info'
  return 'neutral'
}

function participantInitials(p) {
  const name = p.profiles?.full_name || p.guest_name || '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function goToMatches() {
  if (sessions.value.length) {
    openSession(sessions.value[0].id)
  } else {
    startNewSession()
  }
}

function startNewSession() {
  router.push({ name: 'match-session', params: { meetId: route.params.id } })
}

function openSession(sessionId) {
  router.push({ name: 'match-session', params: { meetId: route.params.id, sessionId } })
}

async function openAddPlayer() {
  guestName.value = ''
  showAddPlayer.value = true
  if (!meet.value?.club_id) {
    clubMembersToAdd.value = []
    return
  }
  loadingClubMembers.value = true
  try {
    clubMembersToAdd.value = await listClubMembersNotInMeet(meet.value.id, meet.value.club_id)
  } catch (err) {
    toast.error(err.message || 'Could not load club members.')
  } finally {
    loadingClubMembers.value = false
  }
}

async function handleAddExistingMember(userId) {
  try {
    await addExistingMember(meet.value, userId, user.value.id)
    await reloadParticipants()
    clubMembersToAdd.value = clubMembersToAdd.value.filter((m) => m.id !== userId)
    toast.success('Player added.')
  } catch (err) {
    toast.error(err.message || 'Could not add that player.')
  }
}

async function handleRemoveParticipant(participantId) {
  try {
    await removeParticipant(participantId)
    await reloadParticipants()
    toast.success('Player removed.')
  } catch (err) {
    toast.error(err.message || 'Could not remove that player.')
  }
}

async function handleAddGuest() {
  const trimmed = guestName.value.trim()
  if (!trimmed) return
  try {
    await addGuest(meet.value, trimmed, user.value.id)
    guestName.value = ''
    await reloadParticipants()
    toast.success('Guest added.')
  } catch (err) {
    toast.error(err.message || 'Could not add that guest.')
  }
}

const FORMAT_LABELS = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  team_mexicano: 'Team Mexicano',
  singles: 'Singles',
}
function formatLabel(format) { return FORMAT_LABELS[format] || format }
function sessionStatusLabel(status) {
  if (status === 'in_progress') return 'Live'
  if (status === 'completed') return 'Done'
  return 'Setup'
}
function sessionStatusVariant(status) {
  if (status === 'in_progress') return 'info'
  if (status === 'completed') return 'success'
  return 'neutral'
}
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-detail-view__avatar-stack {
  display: flex;
  margin-bottom: var(--space-s, 8px);
}

.meet-detail-view__avatar-stack-item {
  margin-left: -8px;
  border: 2px solid var(--color-surface, #121212);
}

.meet-detail-view__avatar-stack-item:first-child {
  margin-left: 0;
}

.meet-detail-view__matches {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.participant-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant, #A3A3A3);
  cursor: pointer;
  border-radius: var(--radius-sm, 8px);
  margin-left: var(--space-xs, 4px);
}

.participant-remove:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-error, #C83E3B);
}

.meet-detail-view__matches-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.add-player-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.add-player-sheet__label {
  margin: 0 0 var(--space-xs, 8px);
  font-size: var(--text-xs, 13px);
  font-weight: 700;
  color: var(--color-on-surface-variant, #A3A3A3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.add-player-sheet__empty {
  color: var(--color-on-surface-variant, #A3A3A3);
  font-size: var(--text-sm, 14px);
}

.add-player-sheet__guest {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}
</style>
