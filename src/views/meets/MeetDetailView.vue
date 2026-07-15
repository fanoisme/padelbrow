<template>
  <section v-if="meet" class="meet-detail-view">
    <LiPageHeader :title="meet.title">
      <template #actions>
        <LiButton v-if="myParticipation === 'none'" @click="handleJoin">Join</LiButton>
        <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
        <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
      </template>
    </LiPageHeader>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiCard>
          <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
          <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
          <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
        </LiCard>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <LiCard flush>
          <LiListTile v-for="p in participants" :key="p.id" :title="p.profiles.full_name">
            <template #trailing>
              <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
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
      <div v-show="activeTab === 3">
        <LiEmptyState title="Ready to play?" description="Start a live match session to generate rounds and track scores." icon="trophy">
          <template #action>
            <LiButton @click="goToMatches">Open match session</LiButton>
          </template>
        </LiEmptyState>
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 4">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import MeetChat from '../../components/meets/MeetChat.vue'
import ExpensesPanel from '../../components/payments/ExpensesPanel.vue'
import PaymentsPanel from '../../components/payments/PaymentsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getMeet } = useMeets()
const { listParticipants, joinMeet, leaveMeet } = useMeetParticipants()
const toast = useToast()

const meet = ref(null)
const participants = ref([])
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

onMounted(async () => {
  try {
    meet.value = await getMeet(route.params.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not load this meet.')
  }
})

async function handleJoin() {
  try {
    await joinMeet(meet.value, user.value.id)
    await reloadParticipants()
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

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function goToMatches() {
  router.push({ name: 'match-session', params: { meetId: route.params.id } })
}
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
