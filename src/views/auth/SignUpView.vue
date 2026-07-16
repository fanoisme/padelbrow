<template>
  <section class="signup">
    <div class="signup__inner">
      <button type="button" class="signup__back" @click="go('/')" aria-label="Back to home">
        <LiIcon name="arrow_back" size="md" />
      </button>

      <header class="signup__head">
        <h1>Welcome to PADEL BROW</h1>
        <p>Register now and level up your padel life.</p>
      </header>

      <form @submit.prevent="handleSubmit" class="signup__form">
        <LiTextField v-model="fullName" label="Full name" placeholder="Your name" />
        <LiTextField v-model="phone" label="Phone number" placeholder="8xx xxxx xxxx">
          <template #prefix><span class="signup__flag" aria-hidden="true">🇮🇩</span>&nbsp;+62</template>
        </LiTextField>
        <LiTextField v-model="email" type="email" label="Email address" placeholder="you@example.com" />
        <LiTextField v-model="password" type="password" label="Password" placeholder="••••••••" />

        <div v-if="password" class="signup__strength">
          <div class="signup__strength-meta">
            <span class="signup__strength-label">Password strength</span>
            <span class="signup__strength-tier" :class="tier">{{ tierLabel }}</span>
          </div>
          <div class="signup__strength-bar">
            <span :class="['signup__strength-fill', tier]" :style="{ width: `${(strength / 4) * 100}%` }"></span>
          </div>
          <ul class="signup__checks">
            <li v-for="c in checkItems" :key="c.key" :class="{ 'is-ok': c.ok }">
              <span class="signup__check-dot">
                <LiIcon :name="c.ok ? 'check' : 'close'" size="sm" />
              </span>
              {{ c.label }}
            </li>
          </ul>
        </div>

        <LiTextField
          v-model="confirm"
          type="password"
          label="Confirm password"
          placeholder="••••••••"
          :error="confirmError"
        />

        <p class="signup__secure">
          <LiIcon name="lock" size="sm" color="#F4A600" /> Your data is encrypted and secured.
        </p>

        <p v-if="errorMessage" class="signup__error">{{ errorMessage }}</p>
        <LiButton type="submit" size="lg" :loading="submitting" :disabled="!canSubmit">Continue</LiButton>
      </form>

      <p class="signup__alt">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LiTextField, LiButton, LiIcon } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'

const fullName = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const router = useRouter()
const { signUpWithPassword } = useAuth()
function go(p) { router.push(p) }

const checks = computed(() => ({
  upper: /[A-Z]/.test(password.value),
  lower: /[a-z]/.test(password.value),
  number: /\d/.test(password.value),
  length: password.value.length >= 8,
}))
const checkItems = computed(() => [
  { key: 'upper', label: 'Uppercase letter', ok: checks.value.upper },
  { key: 'number', label: 'Numeric letter', ok: checks.value.number },
  { key: 'lower', label: 'Lowercase letter', ok: checks.value.lower },
  { key: 'length', label: 'Minimum 8 characters', ok: checks.value.length },
])
const strength = computed(() => Object.values(checks.value).filter(Boolean).length)
const tier = computed(() => ['low', 'low', 'mid', 'good', 'strong'][strength.value] || 'low')
const tierLabel = computed(() => ({ low: 'Weak', mid: 'Fair', good: 'Good', strong: 'Strong' })[tier.value])
const confirmError = computed(() =>
  confirm.value && confirm.value !== password.value ? 'Passwords do not match' : ''
)
const canSubmit = computed(() =>
  Boolean(fullName.value && email.value && checks.value.upper && checks.value.lower &&
          checks.value.number && checks.value.length && confirm.value === password.value)
)

async function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await signUpWithPassword(email.value, password.value, fullName.value, phone.value)
    router.push('/')
  } catch (err) {
    errorMessage.value = err.message || 'Sign up failed.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.signup {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay, 80);
  overflow-y: auto;
  background: var(--color-gray-0, #FFFFFF);
}
.signup__inner {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: calc(var(--space-l, 24px) + env(safe-area-inset-top, 0px)) var(--space-l, 24px) calc(var(--space-3xl, 48px) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.signup__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: var(--space-m, 16px);
  border: none;
  background: transparent;
  color: var(--color-gray-900, #333);
  border-radius: var(--radius-pill, 999px);
  cursor: pointer;
  transition: background var(--dur-short, 200ms) var(--ease-out, ease);
}
.signup__back:hover { background: var(--color-gray-100, #F2F2F2); }

.signup__head h1 {
  font-size: var(--text-xl, 24px);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 0 0 var(--space-xs, 4px);
}
.signup__head p {
  color: var(--color-on-surface-variant, #666);
  font-size: var(--text-sm, 15px);
  margin: 0 0 var(--space-xl, 24px);
}

.signup__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
.signup__flag { font-size: 16px; line-height: 1; }

.signup__strength {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
  margin-top: -4px;
}
.signup__strength-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs, 14px);
  color: var(--color-on-surface-variant, #666);
}
.signup__strength-tier { font-weight: 600; }
.signup__strength-tier.low { color: var(--color-red-400, #C83E3B); }
.signup__strength-tier.mid { color: var(--color-orange-400, #FF6B00); }
.signup__strength-tier.good { color: var(--color-yellow-500, #F4A600); }
.signup__strength-tier.strong { color: var(--color-green-500, #4CAF50); }
.signup__strength-bar {
  height: 4px;
  background: var(--color-gray-200, #E6E6E6);
  border-radius: var(--radius-pill, 999px);
  overflow: hidden;
}
.signup__strength-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.25s var(--ease-out, ease), background 0.25s var(--ease-out, ease);
}
.signup__strength-fill.low { background: var(--color-red-400, #C83E3B); }
.signup__strength-fill.mid { background: var(--color-orange-400, #FF6B00); }
.signup__strength-fill.good { background: var(--color-yellow-500, #F4A600); }
.signup__strength-fill.strong { background: var(--color-green-500, #4CAF50); }

.signup__checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs, 8px) var(--space-m, 16px);
}
.signup__checks li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs, 14px);
  color: var(--color-on-surface-variant, #666);
}
.signup__check-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-gray-300, #CCC);
  color: #fff;
}
.signup__checks li.is-ok { color: var(--color-gray-900, #333); }
.signup__checks li.is-ok .signup__check-dot { background: var(--color-green-500, #4CAF50); }

.signup__secure {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-on-surface-variant, #666);
  font-size: var(--text-xs, 14px);
  margin: 2px 0;
}

.signup__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}

.signup__alt {
  text-align: center;
  font-size: var(--text-xs, 14px);
  margin-top: var(--space-l, 20px);
}
.signup__alt a {
  color: var(--color-brand, #FFAF03);
  font-weight: 700;
  text-decoration: none;
}
.signup__alt a:hover { text-decoration: underline; }
</style>
