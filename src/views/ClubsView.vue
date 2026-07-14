<template>
  <section class="clubs-view">
    <LiPageHeader title="Clubs" subtitle="Find or start a padel community near you.">
      <template #actions>
        <LiButton @click="showCreateModal = true">Create club</LiButton>
      </template>
    </LiPageHeader>

    <LiTextField v-model="query" placeholder="Search clubs..." @update:modelValue="handleSearch" />

    <LiEmptyState v-if="clubs.length === 0" title="No clubs found" icon="search" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="clubs-view__list">
        <LiCard v-for="club in clubs" :key="club.id" hover class="clubs-view__card">
          <router-link :to="`/clubs/${club.id}`">
            <h3>{{ club.name }}</h3>
            <p>{{ club.description }}</p>
          </router-link>
        </LiCard>
      </div>
    </LiRevealOnScroll>

    <component :is="isMobile ? LiBottomSheet : LiModal" v-model="showCreateModal" title="Create a club">
      <form @submit.prevent="handleCreate">
        <LiTextField v-model="newClub.name" label="Name" />
        <LiTextField v-model="newClub.slug" label="URL slug" placeholder="padel-brow" />
        <LiTextField v-model="newClub.description" type="area" label="Description" />
        <LiSelect
          v-model="newClub.visibility"
          label="Visibility"
          :options="[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]"
        />
        <LiButton type="submit" :loading="creating">Create</LiButton>
      </form>
    </component>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiCard, LiEmptyState, LiModal, LiBottomSheet, LiSelect, LiPageHeader, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import { useViewport } from '../composables/useViewport.js'

const { user } = useAuth()
const { listClubs, searchClubs, createClub } = useClubs()
const toast = useToast()
const { isMobile } = useViewport()

const clubs = ref([])
const query = ref('')
const showCreateModal = ref(false)
const creating = ref(false)
const newClub = ref({ name: '', slug: '', description: '', visibility: 'public' })

onMounted(async () => {
  clubs.value = await listClubs()
})

async function handleSearch(value) {
  clubs.value = value ? await searchClubs(value) : await listClubs()
}

async function handleCreate() {
  creating.value = true
  try {
    await createClub({ ...newClub.value }, user.value.id)
    showCreateModal.value = false
    newClub.value = { name: '', slug: '', description: '', visibility: 'public' }
    clubs.value = await listClubs()
  } catch (err) {
    toast.error(err.message || 'Could not create the club.')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.clubs-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.clubs-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
