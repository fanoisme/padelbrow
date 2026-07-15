<template>
  <section class="create-comp-view">
    <h1>Create competition</h1>
    <LiGlassCard class="create-comp-view__card">
      <div class="create-comp-view__form">
        <LiSelect v-model="form.club_id" label="Club" :options="clubOptions" placeholder="Select a club" />
        <LiTextField v-model="form.name" label="Name" placeholder="Sunday Cup" />
        <LiSelect
          v-model="form.format"
          label="Format"
          :options="[
            { value: 'round_robin', label: 'Round robin' },
            { value: 'single_elim', label: 'Single elimination' },
          ]"
        />
        <LiTextField v-model="form.registration_opens_at" type="datetime-local" label="Registration opens" />
        <LiTextField v-model="form.registration_closes_at" type="datetime-local" label="Registration closes" />
        <LiTextField v-model="form.starts_at" type="datetime-local" label="Starts at" />
        <LiTextField v-model="form.max_participants" type="number" label="Max participants" />
        <LiTextField v-model="form.fee_amount" type="number" label="Fee (IDR)" />
        <p v-if="errorMessage" class="create-comp-view__error">{{ errorMessage }}</p>
        <LiButton :loading="submitting" @click="handleSubmit">Create competition</LiButton>
      </div>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiGlassCard, LiButton, LiTextField, LiSelect, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useCompetitions } from '../../composables/useCompetitions.js'

const router = useRouter()
const { user } = useAuth()
const { listClubs } = useClubs()
const { createCompetition } = useCompetitions()
const toast = useToast()

const clubs = ref([])
const submitting = ref(false)
const errorMessage = ref('')
const form = ref({
  club_id: '',
  name: '',
  format: 'round_robin',
  registration_opens_at: '',
  registration_closes_at: '',
  starts_at: '',
  max_participants: '8',
  fee_amount: '0',
})

const clubOptions = computed(() => clubs.value.map((c) => ({ value: c.id, label: c.name })))

onMounted(async () => {
  try {
    clubs.value = await listClubs()
  } catch (err) {
    toast.error(err.message || 'Could not load clubs.')
  }
})

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    const payload = {
      name: form.value.name,
      format: form.value.format,
      registration_opens_at: form.value.registration_opens_at || null,
      registration_closes_at: form.value.registration_closes_at || null,
      starts_at: form.value.starts_at || null,
      // Number()-coerce: v-model.number is a no-op on LiTextField, so these
      // arrive as strings. Coerce explicitly; empty → null so NOT NULL/cast
      // constraints in Postgres don't reject a blank field.
      max_participants: form.value.max_participants === '' ? null : Number(form.value.max_participants),
      fee_amount: form.value.fee_amount === '' ? 0 : Number(form.value.fee_amount),
    }
    const comp = await createCompetition(payload, form.value.club_id)
    router.push({ name: 'competition-detail', params: { id: comp.id } })
  } catch (err) {
    errorMessage.value = err.message || 'Could not create the competition.'
    toast.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-comp-view {
  max-width: 560px;
  margin: 0 auto;
}

.create-comp-view__card {
  display: flex;
  flex-direction: column;
}

.create-comp-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-comp-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}
</style>
