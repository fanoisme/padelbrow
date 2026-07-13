<template>
  <section v-if="club" class="club-detail-view">
    <div class="club-detail-view__header">
      <h1>{{ club.name }}</h1>
      <LiButton v-if="!myMembership" @click="handleJoin">Join</LiButton>
      <LiButton v-else variant="secondary" @click="handleLeave">Leave</LiButton>
    </div>
    <p>{{ club.description }}</p>

    <h2>Members</h2>
    <ul class="club-detail-view__members">
      <li v-for="member in members" :key="member.user_id">
        <span>{{ member.profiles.full_name }}</span>
        <LiBadge :label="member.role" variant="brand" />
      </li>
    </ul>

    <ClubMembershipsPanel
      :club-id="club.id"
      :can-manage="myMembership && ['owner', 'organizer'].includes(myMembership.role)"
    />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiButton, LiBadge } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import ClubMembershipsPanel from '../components/clubs/ClubMembershipsPanel.vue'

const route = useRoute()
const { user } = useAuth()
const { getClub, listMembers, getMyMembership, joinClub, leaveClub } = useClubs()

const club = ref(null)
const members = ref([])
const myMembership = ref(null)

async function loadMembership() {
  myMembership.value = await getMyMembership(route.params.id, user.value.id)
}

onMounted(async () => {
  club.value = await getClub(route.params.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
})

async function handleJoin() {
  await joinClub(route.params.id, user.value.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
}

async function handleLeave() {
  await leaveClub(route.params.id, user.value.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
}
</script>

<style scoped>
.club-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.club-detail-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.club-detail-view__members {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.club-detail-view__members li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s, 8px) 0;
}
</style>
