<template>
  <div class="club-memberships-panel">
    <h2>Membership tiers</h2>
    <LiEmptyState v-if="memberships.length === 0 && !canManage" title="No membership tiers yet" icon="credit_card" />
    <div v-else class="club-memberships-panel__list">
      <LiCard v-for="tier in memberships" :key="tier.id">
        <h3>{{ tier.name }}</h3>
        <p>Rp{{ tier.price.toLocaleString('id-ID') }} / {{ tier.period }}</p>
        <LiButton @click="handleSubscribe(tier)">Subscribe</LiButton>
      </LiCard>
    </div>

    <form v-if="canManage" @submit.prevent="handleCreate">
      <h3>Add a tier</h3>
      <LiTextField v-model="newTier.name" label="Name" />
      <LiTextField v-model.number="newTier.price" type="number" label="Price (IDR)" />
      <LiSelect
        v-model="newTier.period"
        label="Period"
        :options="[
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annual', label: 'Annual' },
        ]"
      />
      <LiButton type="submit" :loading="creating">Add tier</LiButton>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiCard, LiButton, LiTextField, LiSelect, LiEmptyState, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubMemberships } from '../../composables/useClubMemberships.js'

const props = defineProps({
  clubId: { type: String, required: true },
  canManage: { type: Boolean, default: false },
})

const { user } = useAuth()
const { listMemberships, createMembership, subscribe } = useClubMemberships()
const toast = useToast()

const memberships = ref([])
const creating = ref(false)
const newTier = ref({ name: '', price: 0, period: 'monthly' })

onMounted(async () => {
  memberships.value = await listMemberships(props.clubId)
})

async function handleSubscribe(tier) {
  try {
    await subscribe(tier.id, user.value.id, tier.period)
  } catch (err) {
    toast.error(err.message || 'Could not subscribe.')
  }
}

async function handleCreate() {
  creating.value = true
  try {
    await createMembership(props.clubId, { ...newTier.value })
    newTier.value = { name: '', price: 0, period: 'monthly' }
    memberships.value = await listMemberships(props.clubId)
  } catch (err) {
    toast.error(err.message || 'Could not create the tier.')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.club-memberships-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.club-memberships-panel__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-m, 16px);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
  max-width: 320px;
}
</style>
