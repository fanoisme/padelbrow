<template>
  <section class="login-view">
    <LiGlassCard class="login-view__card">
      <h1>Sign in to PADEL BROW</h1>
      <form @submit.prevent="handleSubmit">
        <LiTextField v-model="email" type="email" label="Email" placeholder="you@example.com" />
        <LiTextField v-model="password" type="password" label="Password" placeholder="••••••••" />
        <p v-if="errorMessage" class="login-view__error">{{ errorMessage }}</p>
        <LiButton type="submit" :loading="submitting">Sign in</LiButton>
      </form>
      <LiButton variant="secondary" @click="handleGoogle">Sign in with Google</LiButton>
      <p class="login-view__signup-link">
        No account yet? <router-link to="/signup">Sign up</router-link>
      </p>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LiGlassCard, LiTextField, LiButton } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'

const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const router = useRouter()
const route = useRoute()
const { signInWithPassword, signInWithGoogle } = useAuth()

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    await signInWithPassword(email.value, password.value)
    router.push(route.query.redirect || '/')
  } catch (err) {
    errorMessage.value = err.message || 'Sign in failed.'
  } finally {
    submitting.value = false
  }
}

async function handleGoogle() {
  errorMessage.value = ''
  try {
    await signInWithGoogle()
  } catch (err) {
    errorMessage.value = err.message || 'Google sign-in failed.'
  }
}
</script>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  padding: var(--space-xl, 32px) 0;
}

.login-view__card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.login-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}

.login-view__signup-link {
  font-size: var(--text-xs, 14px);
  text-align: center;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
