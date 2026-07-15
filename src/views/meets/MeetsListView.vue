<template>
  <section class="meets-list-view">
    <LiPageHeader title="Meets" subtitle="Book a social match or join one nearby.">
      <template #actions>
        <LiButton @click="$router.push('/meets/new')">Create meet</LiButton>
      </template>
    </LiPageHeader>

    <LiEmptyState v-if="meets.length === 0" title="No upcoming meets" icon="event" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="meets-list-view__list">
        <LiCard v-for="meet in meets" :key="meet.id" hover>
          <router-link :to="`/meets/${meet.id}`">
            <h3>{{ meet.title }}</h3>
            <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          </router-link>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, LiPageHeader, LiRevealOnScroll, useToast } from '../../design-system/components/index.js'
import { useMeets } from '../../composables/useMeets.js'

const { listMeets } = useMeets()
const toast = useToast()
const meets = ref([])

onMounted(async () => {
  try {
    meets.value = await listMeets()
  } catch (err) {
    toast.error(err.message || 'Could not load meets.')
  }
})

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meets-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.meets-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
