<template>
  <section v-if="meet" class="meet-detail-view">
    <div class="meet-detail-view__header">
      <h1>{{ meet.title }}</h1>
      <LiButton v-if="myParticipation === 'none'" @click="handleJoin">Join</LiButton>
      <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
      <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
    </div>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
        <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
        <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
        <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <ul class="meet-detail-view__participants">
          <li v-for="p in participants" :key="p.id">
            <span>{{ p.profiles.full_name }}</span>
            <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
          </li>
        </ul>
      </div>

      <!-- Matches (Phase 4 placeholder) -->
      <div v-show="activeTab === 2">
        <LiEmptyState title="Matches open in Phase 4" icon="trophy" />
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 3">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import MeetChat from '../../components/meets/MeetChat.vue'

const route = useRoute()
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
  { label: 'Matches' },
  { label: 'Chat' },
]

const myParticipation = computed(() => {
  const mine = participants.value.find((p) => p.user_id === user.value?.id)
  if (!mine) return 'none'
  return mine.status
})

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
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-detail-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meet-detail-view__participants {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.meet-detail-view__participants li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
