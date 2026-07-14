<template>
  <section class="network-view">
    <LiPageHeader title="My Network" subtitle="Players you follow, and new players to discover." />

    <div class="network-view__section">
      <h2>Following</h2>
      <LiEmptyState v-if="followees.length === 0" title="You're not following anyone yet" icon="person" />
      <LiCard v-else flush>
        <LiListTile v-for="person in followees" :key="person.id" :title="person.full_name">
          <template #trailing>
            <LiButton variant="secondary" size="sm" @click="handleUnfollow(person.id)">Unfollow</LiButton>
          </template>
        </LiListTile>
      </LiCard>
    </div>

    <div class="network-view__section">
      <h2>Discover players</h2>
      <form data-testid="discovery-form" @submit.prevent="handleSearch">
        <LiTextField v-model="searchArea" placeholder="Search by area..." />
        <LiButton type="submit">Search</LiButton>
      </form>
      <LiCard v-if="searchResults.length" flush>
        <LiListTile
          v-for="person in searchResults"
          :key="person.id"
          :title="person.full_name"
          :subtitle="`Level ${person.skill_level}`"
        >
          <template #trailing>
            <LiButton size="sm" @click="handleFollow(person.id)">Follow</LiButton>
          </template>
        </LiListTile>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiEmptyState, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
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
</script>

<style scoped>
.network-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.network-view__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

form {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
