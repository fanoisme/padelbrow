<template>
  <section class="create-meet-view">
    <h1>Create a meet</h1>
    <ol class="create-meet-view__steps">
      <li v-for="(s, i) in stepLabels" :key="s" :class="{ 'is-active': step === i, 'is-done': step > i }">{{ s }}</li>
    </ol>

    <LiCard class="create-meet-view__card">
      <!-- Step 0: club + sport + format -->
      <div v-if="step === 0">
        <LiSelect
          v-model="form.club_id"
          label="Club (optional)"
          :options="clubOptions"
          placeholder="No club"
        />
        <LiSelect
          v-model="form.sport"
          label="Sport"
          :options="[{ value: 'padel', label: 'Padel' }, { value: 'billiards', label: 'Billiards' }, { value: 'football', label: 'Football' }]"
        />
        <LiSelect
          v-model="form.format"
          label="Format"
          :options="[{ value: 'social', label: 'Social' }, { value: 'americano', label: 'Americano' }, { value: 'mexicano', label: 'Mexicano' }]"
        />
      </div>

      <!-- Step 1: title + schedule + venue -->
      <div v-else-if="step === 1">
        <LiTextField v-model="form.title" label="Title" placeholder="Tuesday night social" />
        <LiTextField v-model="form.starts_at" type="datetime-local" label="Starts at" />
        <LiTextField v-model.number="form.duration_minutes" type="number" label="Duration (minutes)" />
        <LiTextField v-model="form.venue_name" label="Venue" placeholder="Court name" />
        <LiTextField v-model="form.venue_address" label="Address" />
      </div>

      <!-- Step 2: players + privacy + fee + level -->
      <div v-else-if="step === 2">
        <LiTextField v-model.number="form.max_players" type="number" label="Max players" />
        <LiSelect
          v-model="form.privacy"
          label="Privacy"
          :options="[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]"
        />
        <LiTextField v-model.number="form.fee_amount" type="number" label="Fee (IDR)" />
        <LiTextField v-model.number="form.min_level" type="number" label="Min level" />
        <LiTextField v-model.number="form.max_level" type="number" label="Max level" />
      </div>

      <!-- Step 3: advanced -->
      <div v-else-if="step === 3">
        <LiTextField v-model="form.gender_restriction" label="Gender restriction (optional)" placeholder="e.g. men-only / ladies" />
        <LiSelect
          v-model="form.host_role"
          label="Host's role"
          :options="[{ value: 'host_and_play', label: 'Host & play' }, { value: 'host_only', label: 'Host only' }]"
        />
        <LiToggle v-model="form.auto_approve" label="Auto-approve joiners" />
        <LiToggle v-model="form.allow_plus_one" label="Allow +1" />
      </div>

      <!-- Step 4: review + create -->
      <div v-else>
        <p>Review your meet and create it.</p>
        <ul class="create-meet-view__review">
          <li><strong>{{ form.title || 'Untitled meet' }}</strong></li>
          <li>{{ form.sport }} · {{ form.format }}</li>
          <li>{{ form.venue_name || 'Venue TBD' }}</li>
          <li>Max {{ form.max_players }} players · {{ form.privacy }}</li>
        </ul>
        <p v-if="errorMessage" class="create-meet-view__error">{{ errorMessage }}</p>
      </div>

      <div class="create-meet-view__actions">
        <LiButton v-if="step > 0" variant="secondary" @click="step--">Back</LiButton>
        <LiButton v-if="step < stepLabels.length - 1" @click="step++">Next</LiButton>
        <LiButton v-else :loading="submitting" @click="handleSubmit">Create meet</LiButton>
      </div>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiCard, LiButton, LiTextField, LiSelect, LiToggle, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useMeets } from '../../composables/useMeets.js'

const router = useRouter()
const { user } = useAuth()
const { listClubs } = useClubs()
const { createMeet } = useMeets()
const toast = useToast()

const stepLabels = ['Basics', 'Schedule', 'Players', 'Advanced', 'Review']
const step = ref(0)
const submitting = ref(false)
const errorMessage = ref('')
const clubs = ref([])

const form = ref({
  club_id: '',
  sport: 'padel',
  format: 'social',
  title: '',
  starts_at: '',
  duration_minutes: 60,
  venue_name: '',
  venue_address: '',
  max_players: 4,
  privacy: 'public',
  fee_amount: 0,
  min_level: null,
  max_level: null,
  gender_restriction: '',
  host_role: 'host_and_play',
  auto_approve: false,
  allow_plus_one: true,
})

const clubOptions = computed(() => [
  { value: '', label: 'No club' },
  ...clubs.value.map((c) => ({ value: c.id, label: c.name })),
])

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
    const payload = { ...form.value }
    if (!payload.club_id) delete payload.club_id
    if (payload.min_level === null || payload.min_level === '') delete payload.min_level
    if (payload.max_level === null || payload.max_level === '') delete payload.max_level
    if (!payload.gender_restriction) delete payload.gender_restriction
    const meet = await createMeet(payload, user.value.id)
    router.push({ name: 'meet-detail', params: { id: meet.id } })
  } catch (err) {
    errorMessage.value = err.message || 'Could not create the meet.'
    toast.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-meet-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
  max-width: 560px;
  margin: 0 auto;
}

.create-meet-view__steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-s, 8px);
  list-style: none;
  padding: 0;
  font-size: var(--text-xs, 14px);
}

.create-meet-view__steps li {
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border-radius: var(--radius-pill, 999px);
  background: var(--color-gray-100, #F2F2F2);
  color: var(--color-gray-600, #808080);
}

.create-meet-view__steps li.is-active {
  background: var(--color-brand, #FFAF03);
  color: var(--color-gray-900, #333333);
  font-weight: 600;
}

.create-meet-view__steps li.is-done {
  color: var(--color-gray-800, #4D4D4D);
}

.create-meet-view__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-meet-view__card > div:first-child {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-meet-view__review {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.create-meet-view__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-s, 8px);
}

.create-meet-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}
</style>
