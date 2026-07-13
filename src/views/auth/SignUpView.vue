<template>
  <section class="signup-view">
    <LiCard class="signup-view__card">
      <h1>Create your account</h1>
      <form @submit.prevent="handleSubmit">
        <LiTextField v-model="fullName" label="Full name" placeholder="Your name" />
        <LiTextField v-model="email" type="email" label="Email" placeholder="you@example.com" />
        <LiTextField v-model="password" type="password" label="Password" placeholder="••••••••" />
        <p v-if="errorMessage" class="signup-view__error">{{ errorMessage }}</p>
        <LiButton type="submit" :loading="submitting">Sign up</LiButton>
      </form>
      <p class="signup-view__login-link">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </p>
    </LiCard>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LiCard, LiTextField, LiButton } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'

const fullName = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const router = useRouter()
const { signUpWithPassword } = useAuth()

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    await signUpWithPassword(email.value, password.value, fullName.value)
    router.push('/')
  } catch (err) {
    errorMessage.value = err.message || 'Sign up failed.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.signup-view {
  display: flex;
  justify-content: center;
  padding: var(--space-xl, 32px) 0;
}

.signup-view__card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.signup-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}

.signup-view__login-link {
  font-size: var(--text-xs, 14px);
  text-align: center;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
