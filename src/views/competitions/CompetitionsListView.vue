<template>
  <section class="comps-list-view">
    <div class="comps-list-view__header">
      <h1>Competitions</h1>
      <LiButton @click="$router.push('/competitions/new')">Create competition</LiButton>
    </div>

    <LiEmptyState v-if="competitions.length === 0" title="No competitions yet" icon="trophy" />
    <div v-else class="comps-list-view__list">
      <LiCard v-for="comp in competitions" :key="comp.id" hover>
        <router-link :to="`/competitions/${comp.id}`">
          <h3>{{ comp.name }}</h3>
          <p>{{ comp.format }} · {{ comp.status }}</p>
        </router-link>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, useToast } from '../../design-system/components/index.js'
import { useCompetitions } from '../../composables/useCompetitions.js'

const { listCompetitions } = useCompetitions()
const toast = useToast()
const competitions = ref([])

onMounted(async () => {
  try {
    competitions.value = await listCompetitions()
  } catch (err) {
    toast.error(err.message || 'Could not load competitions.')
  }
})
</script>

<style scoped>
.comps-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.comps-list-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comps-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
