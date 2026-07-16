<template>
  <section class="login">
    <div class="login__bg" aria-hidden="true">
      <span class="login__orb login__orb--1"></span>
      <span class="login__orb login__orb--2"></span>
    </div>

    <div class="login__content">
      <router-link to="/" class="login__wordmark" aria-label="PADEL BROW home">
        <span class="login__wordmark-a">padel</span><span class="login__wordmark-b">brow</span>
      </router-link>

      <form @submit.prevent="handleSubmit" class="login__form">
        <LiTextField v-model="email" type="email" label="Email" placeholder="you@example.com" />
        <LiTextField v-model="password" type="password" label="Password" placeholder="••••••••" />

        <p v-if="errorMessage" class="login__error">{{ errorMessage }}</p>

        <LiButton type="submit" size="lg" :loading="submitting">Continue to login</LiButton>
      </form>

      <div class="login__divider"><span>or</span></div>

      <LiButton variant="secondary" size="lg" @click="handleGoogle">Continue with Google</LiButton>

      <p class="login__alt">
        No account yet? <router-link to="/signup">Create an account</router-link>
      </p>
    </div>

    <p class="login__version">v0.1.0</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LiTextField, LiButton } from '../../design-system/components/index.js'
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
.login {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay, 80);
  overflow-y: auto;
  background: #1E1E1E;
  color: #FFFFFF;
}

.login__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.login__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.35;
}
.login__orb--1 {
  width: 340px; height: 340px;
  top: -90px; left: -80px;
  background: radial-gradient(circle, rgba(255, 175, 3, 0.45), transparent 70%);
}
.login__orb--2 {
  width: 300px; height: 300px;
  bottom: -100px; right: -70px;
  background: radial-gradient(circle, rgba(255, 107, 0, 0.35), transparent 70%);
}
@media (prefers-reduced-motion: reduce) { .login__orb { opacity: 0.25; } }

.login__content {
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: calc(var(--space-3xl, 48px) + env(safe-area-inset-top, 0px)) var(--space-l, 24px) var(--space-3xl, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-l, 24px);
}

.login__wordmark {
  text-decoration: none;
  font-weight: 800;
  font-size: clamp(2.4rem, 9vw, 3rem);
  letter-spacing: -0.03em;
  line-height: 1;
  text-align: center;
}
.login__wordmark-a { color: var(--color-brand, #FFAF03); }
.login__wordmark-b { color: #FFFFFF; }

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.login__error {
  color: #FF8A80;
  font-size: var(--text-xs, 14px);
  margin: 0;
}

.login__divider {
  display: flex;
  align-items: center;
  gap: var(--space-m, 16px);
  color: rgba(255, 255, 255, 0.45);
  font-size: var(--text-xs, 14px);
}
.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.login__alt {
  text-align: center;
  font-size: var(--text-xs, 14px);
  color: rgba(255, 255, 255, 0.7);
}
.login__alt a {
  color: var(--color-brand, #FFAF03);
  font-weight: 700;
  text-decoration: none;
}
.login__alt a:hover { text-decoration: underline; }

.login__version {
  position: absolute;
  bottom: calc(var(--space-m, 16px) + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: var(--text-xxs, 12px);
  z-index: 1;
}

/* ── Restyle Lithium inputs + secondary button for the dark surface ── */
.login__form :deep(.li-textfield-label) {
  color: rgba(255, 255, 255, 0.65);
}
.login :deep(.li-textfield-input-group) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-sm, 10px);
}
.login :deep(.li-textfield-input-group.is-focused) {
  border-color: var(--color-brand, #FFAF03);
}
.login :deep(.li-textfield-input) {
  color: #FFFFFF;
}
.login :deep(.li-textfield-input::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}
.login :deep(.li-textfield-prefix) {
  color: rgba(255, 255, 255, 0.8);
}

.login :deep(.li-btn-secondary) {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.login :deep(.li-btn-secondary:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.5);
}
.login :deep(.li-btn-secondary .li-ripple-animation) {
  background-color: rgba(255, 255, 255, 0.12);
}
</style>
