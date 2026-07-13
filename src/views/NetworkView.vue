<template>
  <section class="network-view">
    <h1>My Network</h1>

    <div class="network-view__section">
      <h2>Following</h2>
      <LiEmptyState v-if="followees.length === 0" title="You're not following anyone yet" icon="person" />
      <ul v-else class="network-view__list">
        <li v-for="person in followees" :key="person.id">
          <span>{{ person.full_name }}</span>
          <LiButton variant="secondary" size="sm" @click="handleUnfollow(person.id)">Unfollow</LiButton>
        </li>
      </ul>
    </div>

    <div class="network-view__section">
      <h2>Discover players</h2>
      <form data-testid="discovery-form" @submit.prevent="handleSearch">
        <LiTextField v-model="searchArea" placeholder="Search by area..." />
        <LiButton type="submit">Search</LiButton>
      </form>
      <ul class="network-view__list">
        <li v-for="person in searchResults" :key="person.id">
          <span>{{ person.full_name }} (level {{ person.skill_level }})</span>
          <LiButton size="sm" @click="handleFollow(person.id)">Follow</LiButton>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiEmptyState, useToast } from '../design-system/components/index.js'
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

.network-view__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.network-view__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

form {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
