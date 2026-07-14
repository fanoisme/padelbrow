<template>
  <section class="profile-view">
    <LiGlassCard class="profile-view__card">
      <h1>My profile</h1>
      <form v-if="form" @submit.prevent="handleSave">
        <LiTextField v-model="form.full_name" label="Full name" />
        <LiTextField v-model="form.phone" label="Phone" />
        <LiSelect
          v-model="form.gender"
          label="Gender"
          :options="[
            { value: 'unspecified', label: 'Prefer not to say' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]"
        />
        <LiTextField v-model="form.birthdate" type="date" label="Birthdate" />
        <LiTextField v-model.number="form.skill_level" type="number" label="Skill level" />
        <LiTextField v-model="form.home_area" label="Home area" placeholder="e.g. Jakarta Selatan" />
        <p v-if="successMessage" class="profile-view__success">{{ successMessage }}</p>
        <LiButton type="submit" :loading="saving">Save changes</LiButton>
      </form>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiGlassCard, LiTextField, LiSelect, LiButton } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useProfile } from '../composables/useProfile.js'

const { user } = useAuth()
const { fetchProfile, updateProfile } = useProfile()

const form = ref(null)
const saving = ref(false)
const successMessage = ref('')

onMounted(async () => {
  const data = await fetchProfile(user.value.id)
  if (data) form.value = { ...data }
})

async function handleSave() {
  saving.value = true
  successMessage.value = ''
  try {
    await updateProfile(user.value.id, {
      full_name: form.value.full_name,
      phone: form.value.phone,
      gender: form.value.gender,
      birthdate: form.value.birthdate || null,
      skill_level: form.value.skill_level,
      home_area: form.value.home_area,
    })
    successMessage.value = 'Profile updated.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-view {
  display: flex;
  justify-content: center;
  padding: var(--space-xl, 32px) 0;
}

.profile-view__card {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.profile-view__success {
  color: var(--color-green-600, #10B981);
  font-size: var(--text-xs, 14px);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
