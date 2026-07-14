<template>
  <section v-if="club" class="club-detail-view">
    <LiPageHeader :title="club.name" :subtitle="club.description">
      <template #actions>
        <LiButton variant="secondary" @click="goToFeed">Club feed</LiButton>
        <LiButton v-if="!myMembership" @click="handleJoin">Join</LiButton>
        <LiButton v-else variant="secondary" @click="handleLeave">Leave</LiButton>
      </template>
    </LiPageHeader>

    <h2>Members</h2>
    <LiCard flush>
      <LiListTile v-for="member in members" :key="member.user_id" :title="member.profiles.full_name">
        <template #trailing>
          <LiBadge :label="member.role" variant="brand" />
        </template>
      </LiListTile>
    </LiCard>

    <ClubMembershipsPanel
      :club-id="club.id"
      :can-manage="myMembership && ['owner', 'organizer'].includes(myMembership.role)"
    />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import ClubMembershipsPanel from '../components/clubs/ClubMembershipsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getClub, listMembers, getMyMembership, joinClub, leaveClub } = useClubs()
const toast = useToast()

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
  try {
    await joinClub(route.params.id, user.value.id)
    members.value = await listMembers(route.params.id)
    await loadMembership()
  } catch (err) {
    toast.error(err.message || 'Could not join the club.')
  }
}

async function handleLeave() {
  try {
    await leaveClub(route.params.id, user.value.id)
    members.value = await listMembers(route.params.id)
    await loadMembership()
  } catch (err) {
    toast.error(err.message || 'Could not leave the club.')
  }
}

function goToFeed() {
  router.push({ name: 'club-feed', params: { id: route.params.id } })
}
</script>

<style scoped>
.club-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
