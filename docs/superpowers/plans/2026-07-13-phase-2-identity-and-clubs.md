# PADEL BROW — Phase 2 (Identity & Clubs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build auth (email/password + Google), profile view/edit, club create/browse/join/manage, club membership tiers + subscribe, player following, and player discovery — the identity/social layer every later phase (Meets, Match Engine, ...) builds on.

**Architecture:** Vue 3 composables (`src/composables/`) wrap Supabase Auth/Postgres calls and hold reactive state; views (`src/views/`) consume composables and render with the vendored Lithium (`Li*`) components; a global `router.beforeEach` guard protects routes flagged `meta.requiresAuth`.

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router (already hash-mode), `@supabase/supabase-js` (already wrapped in `src/lib/supabase.js`), Vitest + `@vue/test-utils`.

## Global Constraints

- Vue 3 Composition API with `<script setup>` for every component (per spec §2).
- Never hardcode colors/spacing/radius outside `var(--token-name, <fallback>)` — use `Li*` components from `src/design-system/components/index.js` wherever one fits, rather than building raw HTML controls.
- All database access goes through `src/lib/supabase.js`'s exported `supabase` client — RLS on the Supabase side is the real security boundary, so composables don't need to re-implement authorization checks the database already enforces (e.g. don't bother client-side-checking "am I the club owner" before calling an update — let a failed RLS policy surface as a Postgres error instead).
- Router stays in hash mode (`createWebHashHistory`, already set up in `src/router/index.js`).
- Existing files not to break: `src/App.vue`, `src/main.js`, `src/layouts/AppLayout.vue`, `src/router/index.js`, `src/views/HomeView.vue`, `src/views/NotFoundView.vue` and their `.spec.js` siblings — all already committed and tested; this plan modifies several of them incrementally, never wholesale-rewrites in a way that drops prior tests.
- Reference tables already live via Phase 1 migrations, RLS-correct after the Phase 1 final-review fixes: `public.profiles`, `public.blocks`, `public.clubs`, `public.club_members` (self-join as `member`; club creator bootstraps their own `owner` row via `clubs.owner_id`; existing owner/organizer can add/update any member), `public.club_memberships`, `public.club_membership_subscriptions`, `public.follows`.

---

## File Structure

```
src/
├── composables/
│   ├── useAuth.js                  (session state, sign up/in/out, Google OAuth)
│   ├── useProfile.js               (fetch/update own profile)
│   ├── useClubs.js                 (list/search/create/join/leave, get one, list members)
│   ├── useClubMemberships.js       (list/create tiers, subscribe)
│   ├── useFollows.js               (follow/unfollow/list followees)
│   └── usePlayerDiscovery.js       (search players by level/area, respecting blocks)
├── views/
│   ├── auth/
│   │   ├── LoginView.vue
│   │   └── SignUpView.vue
│   ├── ProfileView.vue
│   ├── ClubsView.vue
│   ├── ClubDetailView.vue
│   └── NetworkView.vue
├── components/
│   └── clubs/
│       └── ClubMembershipsPanel.vue
├── router/index.js                 (modified: new routes + auth guard)
└── layouts/AppLayout.vue           (modified: auth-aware nav)
```

---

### Task 1: Auth composable (`useAuth.js`)

**Files:**
- Create: `src/composables/useAuth.js`
- Test: `src/composables/useAuth.spec.js`

**Interfaces:**
- Produces: `initAuth(): Promise<void>` (call once, before mounting the app), `useAuth(): { user: Ref<User|null>, signUpWithPassword(email, password, fullName): Promise<object>, signInWithPassword(email, password): Promise<object>, signInWithGoogle(): Promise<object>, signOut(): Promise<void> }`. `user.value` is `null` when signed out. Every later task that needs "am I logged in" / "who am I" imports `useAuth` and reads `user.value.id`.

- [ ] **Step 1: Write the failing test**

`src/composables/useAuth.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase.js'
import { initAuth, useAuth } from './useAuth.js'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initAuth populates user from the existing session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.com' } } } })
    await initAuth()
    const { user } = useAuth()
    expect(user.value).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('signInWithPassword throws on error and does not resolve data', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })
    const { signInWithPassword } = useAuth()
    await expect(signInWithPassword('a@b.com', 'wrong')).rejects.toEqual({ message: 'Invalid credentials' })
  })

  it('signOut clears the user', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    await initAuth()
    supabase.auth.signOut.mockResolvedValue({ error: null })
    const { user, signOut } = useAuth()
    await signOut()
    expect(user.value).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useAuth`
Expected: FAIL — `src/composables/useAuth.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useAuth.js`:
```js
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const user = ref(null)
let initPromise = null

export function initAuth() {
  if (!initPromise) {
    initPromise = supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })
    })
  }
  return initPromise
}

async function signUpWithPassword(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

async function signInWithGoogle() {
  // redirectTo intentionally has no hash fragment: Supabase appends the OAuth
  // `?code=` query param to this URL, and query params can't follow a `#` —
  // landing on the bare origin lets supabase-js's built-in URL detection
  // pick up the session before the hash-mode router takes over.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  if (error) throw error
  return data
}

async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  user.value = null
}

export function useAuth() {
  return { user, signUpWithPassword, signInWithPassword, signInWithGoogle, signOut }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useAuth`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useAuth.js src/composables/useAuth.spec.js
git commit -m "Add useAuth composable for session state and sign up/in/out"
```

---

### Task 2: Login view, route, and the auth navigation guard

**Files:**
- Create: `src/views/auth/LoginView.vue`
- Test: `src/views/auth/LoginView.spec.js`
- Modify: `src/router/index.js`
- Test: `src/router/index.spec.js`

**Interfaces:**
- Consumes: `useAuth()` from Task 1.
- Produces: route named `login` at `/login`; a generic `router.beforeEach` guard that redirects to `login` (with `?redirect=<attempted path>`) whenever the target route has `meta.requiresAuth === true` and `user.value` is falsy. Every later protected route just sets `meta: { requiresAuth: true }` — no further guard code needed.

- [ ] **Step 1: Write the failing router-guard test**

Append to `src/router/index.spec.js` (existing file already has 2 tests for `home`/`not-found` — add to it, don't replace them):
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import router from './index.js'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../composables/useAuth.js'

describe('router', () => {
  it('resolves the home route', async () => {
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('resolves unknown paths to not-found', async () => {
    await router.push('/some/unknown/path')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('router auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when the target route requires auth and there is no user', async () => {
    useAuth.mockReturnValue({ user: { value: null } })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/login-guard-test-protected')
  })

  it('allows navigation when a user is present', async () => {
    useAuth.mockReturnValue({ user: { value: { id: 'u1' } } })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('protected-test-route')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- router`
Expected: FAIL — `login` route doesn't exist, and there's no route named `protected-test-route` or guard logic yet.

- [ ] **Step 3: Create `LoginView.vue`**

`src/views/auth/LoginView.vue`:
```vue
<template>
  <section class="login-view">
    <LiCard class="login-view__card">
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
    </LiCard>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LiCard, LiTextField, LiButton } from '../../design-system/components/index.js'
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
```

- [ ] **Step 4: Write `LoginView.spec.js`**

`src/views/auth/LoginView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    signInWithPassword: vi.fn().mockResolvedValue({}),
    signInWithGoogle: vi.fn().mockResolvedValue({}),
  })),
}))

import LoginView from './LoginView.vue'

describe('LoginView', () => {
  it('renders email/password fields and a submit button', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Sign in to PADEL BROW')
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 5: Add the `login` route and the auth guard to the router**

`src/router/index.js`:
```js
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import LoginView from '../views/auth/LoginView.vue'
import { useAuth } from '../composables/useAuth.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
  ]
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const { user } = useAuth()
    if (!user.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
})

export default router
```

- [ ] **Step 6: Add the temporary protected test route used only by the guard test**

The guard test above navigates to `/login-guard-test-protected` and expects a route named `protected-test-route` to exist when authenticated. Add it directly in the test file instead of the real router, using `router.addRoute` so it doesn't pollute the production route table — update the two guard-test `it` blocks in `src/router/index.spec.js` to register it first:

```js
describe('router auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (!router.hasRoute('protected-test-route')) {
      router.addRoute({
        path: '/login-guard-test-protected',
        name: 'protected-test-route',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      })
    }
  })

  it('redirects to login when the target route requires auth and there is no user', async () => {
    useAuth.mockReturnValue({ user: { value: null } })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/login-guard-test-protected')
  })

  it('allows navigation when a user is present', async () => {
    useAuth.mockReturnValue({ user: { value: { id: 'u1' } } })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('protected-test-route')
  })
})
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all prior tests plus the new router and LoginView tests.

- [ ] **Step 8: Verify the build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/views/auth/LoginView.vue src/views/auth/LoginView.spec.js src/router/index.js src/router/index.spec.js
git commit -m "Add LoginView, login route, and auth navigation guard"
```

---

### Task 3: Sign-up view and route

**Files:**
- Create: `src/views/auth/SignUpView.vue`
- Test: `src/views/auth/SignUpView.spec.js`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `useAuth().signUpWithPassword` from Task 1.
- Produces: route named `signup` at `/signup`.

- [ ] **Step 1: Write the failing test**

`src/views/auth/SignUpView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    signUpWithPassword: vi.fn().mockResolvedValue({}),
  })),
}))

import SignUpView from './SignUpView.vue'

describe('SignUpView', () => {
  it('renders name/email/password fields and a submit button', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(SignUpView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Create your account')
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SignUpView`
Expected: FAIL — `SignUpView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/auth/SignUpView.vue`:
```vue
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
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add the import and route entry:
```js
import SignUpView from '../views/auth/SignUpView.vue'
```
and inside `routes:`, right after the `login` route:
```js
    { path: '/signup', name: 'signup', component: SignUpView },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/auth/SignUpView.vue src/views/auth/SignUpView.spec.js src/router/index.js
git commit -m "Add SignUpView and signup route"
```

---

### Task 4: Profile composable (`useProfile.js`)

**Files:**
- Create: `src/composables/useProfile.js`
- Test: `src/composables/useProfile.spec.js`

**Interfaces:**
- Produces: `useProfile(): { profile: Ref<object|null>, loading: Ref<boolean>, error: Ref<string|null>, fetchProfile(userId): Promise<object|null>, updateProfile(userId, updates): Promise<object> }`.

- [ ] **Step 1: Write the failing test**

`src/composables/useProfile.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useProfile } from './useProfile.js'

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchProfile loads the profile row for the given user id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Fano' }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { profile, fetchProfile } = useProfile()
    const result = await fetchProfile('u1')

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'u1')
    expect(result).toEqual({ id: 'u1', full_name: 'Fano' })
    expect(profile.value).toEqual({ id: 'u1', full_name: 'Fano' })
  })

  it('updateProfile writes the given fields and updates local state', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Fano B' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { profile, updateProfile } = useProfile()
    const result = await updateProfile('u1', { full_name: 'Fano B' })

    expect(update).toHaveBeenCalledWith({ full_name: 'Fano B' })
    expect(result).toEqual({ id: 'u1', full_name: 'Fano B' })
    expect(profile.value).toEqual({ id: 'u1', full_name: 'Fano B' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useProfile`
Expected: FAIL — `useProfile.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useProfile.js`:
```js
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

export function useProfile() {
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchProfile(userId) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    loading.value = false
    if (err) {
      error.value = err.message
      return null
    }
    profile.value = data
    return data
  }

  async function updateProfile(userId, updates) {
    const { data, error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (err) throw err
    profile.value = data
    return data
  }

  return { profile, loading, error, fetchProfile, updateProfile }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useProfile`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProfile.js src/composables/useProfile.spec.js
git commit -m "Add useProfile composable for fetching and updating a profile"
```

---

### Task 5: Profile view and route

**Files:**
- Create: `src/views/ProfileView.vue`
- Test: `src/views/ProfileView.spec.js`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `useAuth().user` (Task 1), `useProfile()` (Task 4).
- Produces: route named `profile` at `/profile`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/ProfileView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const fetchProfile = vi.fn().mockResolvedValue({ id: 'u1', full_name: 'Fano', phone: '', gender: 'unspecified', birthdate: null, skill_level: null, home_area: '' })
const updateProfile = vi.fn().mockResolvedValue({})

vi.mock('../composables/useProfile.js', () => ({
  useProfile: vi.fn(() => ({
    profile: { value: null },
    fetchProfile,
    updateProfile,
  })),
}))

import ProfileView from './ProfileView.vue'

describe('ProfileView', () => {
  it('fetches the current user profile on mount', async () => {
    mount(ProfileView)
    await flushPromises()
    expect(fetchProfile).toHaveBeenCalledWith('u1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProfileView`
Expected: FAIL — `ProfileView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/ProfileView.vue`:
```vue
<template>
  <section class="profile-view">
    <LiCard class="profile-view__card">
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
    </LiCard>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiCard, LiTextField, LiSelect, LiButton } from '../design-system/components/index.js'
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
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add the import:
```js
import ProfileView from '../views/ProfileView.vue'
```
and inside `routes:`:
```js
    { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/ProfileView.vue src/views/ProfileView.spec.js src/router/index.js
git commit -m "Add ProfileView and profile route"
```

---

### Task 6: Auth-aware navigation in `AppLayout`

**Files:**
- Modify: `src/layouts/AppLayout.vue`
- Modify: `src/layouts/AppLayout.spec.js`

**Interfaces:**
- Consumes: `useAuth()` (Task 1).
- Produces: nav links to Clubs/Network/Profile + a "Sign out" button when `user.value` is truthy; a "Sign in" link when it isn't. Later phases (Meets, etc.) add their own nav links to this same header the same way.

- [ ] **Step 1: Update the failing test first**

`src/layouts/AppLayout.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from './AppLayout.vue'

const signOut = vi.fn().mockResolvedValue()

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: null }, signOut })),
}))

import { useAuth } from '../composables/useAuth.js'

describe('AppLayout', () => {
  it('renders the PADEL BROW mark, Allo Bank logo, title, and slot content', () => {
    useAuth.mockReturnValue({ user: { value: null }, signOut })
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' },
      global: { stubs: { RouterLink: true } },
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.find('img.app-header__mark').exists()).toBe(true)
    expect(wrapper.find('img.app-header__allo').exists()).toBe(true)
    expect(wrapper.html()).toContain('page content')
  })

  it('shows a sign-in link when logged out', () => {
    useAuth.mockReturnValue({ user: { value: null }, signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: true } } })
    expect(wrapper.text()).toContain('Sign in')
  })

  it('shows nav links and a sign-out button when logged in', () => {
    useAuth.mockReturnValue({ user: { value: { id: 'u1' } }, signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: true } } })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Network')
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('Sign out')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AppLayout`
Expected: FAIL — nav links/sign-out button don't exist yet.

- [ ] **Step 3: Update `AppLayout.vue`**

`src/layouts/AppLayout.vue`:
```vue
<template>
  <div class="app-shell">
    <header class="app-header">
      <img class="app-header__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
      <span class="app-header__title">PADEL BROW</span>
      <nav v-if="user" class="app-header__nav">
        <router-link to="/clubs">Clubs</router-link>
        <router-link to="/network">Network</router-link>
        <router-link to="/profile">Profile</router-link>
        <button class="app-header__signout" @click="handleSignOut">Sign out</button>
      </nav>
      <nav v-else class="app-header__nav">
        <router-link to="/login">Sign in</router-link>
      </nav>
      <img class="app-header__allo" src="../assets/logo-allo.png" alt="Allo Bank" />
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuth } from '../composables/useAuth.js'

const { user, signOut } = useAuth()

async function handleSignOut() {
  await signOut()
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: var(--space-m, 16px) var(--space-l, 24px);
  background: var(--surface-glass, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(var(--blur-md, 20px));
  border-bottom: 1px solid var(--border-subtle-color, rgba(0, 0, 0, 0.06));
}

.app-header__mark {
  width: 36px;
  height: 36px;
}

.app-header__title {
  font-weight: 800;
  font-size: var(--text-md, 18px);
  color: var(--color-gray-900, #333333);
  flex: 1;
}

.app-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-m, 16px);
  font-size: var(--text-xs, 14px);
}

.app-header__signout {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--color-gray-700, #666666);
}

.app-header__allo {
  height: 24px;
  width: auto;
}

.app-main {
  flex: 1;
  padding: var(--space-l, 24px);
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify the build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/AppLayout.vue src/layouts/AppLayout.spec.js
git commit -m "Add auth-aware navigation to AppLayout"
```

---

### Task 7: Clubs composable — list, search, create, join, leave, my membership

**Files:**
- Create: `src/composables/useClubs.js`
- Test: `src/composables/useClubs.spec.js`

**Interfaces:**
- Produces: `useClubs(): { listClubs(): Promise<object[]>, searchClubs(query): Promise<object[]>, createClub({ name, slug, description, visibility }, ownerId): Promise<object>, joinClub(clubId, userId): Promise<void>, leaveClub(clubId, userId): Promise<void>, getMyMembership(clubId, userId): Promise<object|null> }`.

- [ ] **Step 1: Write the failing test**

`src/composables/useClubs.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useClubs } from './useClubs.js'

describe('useClubs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listClubs orders clubs by name', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'c1', name: 'Padel Brow' }], error: null })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listClubs } = useClubs()
    const result = await listClubs()

    expect(supabase.from).toHaveBeenCalledWith('clubs')
    expect(order).toHaveBeenCalledWith('name')
    expect(result).toEqual([{ id: 'c1', name: 'Padel Brow' }])
  })

  it('createClub inserts the club then bootstraps the owner membership row', async () => {
    const clubSingle = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Padel Brow' }, error: null })
    const clubSelect = vi.fn(() => ({ single: clubSingle }))
    const clubInsert = vi.fn(() => ({ select: clubSelect }))
    const memberInsert = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'clubs') return { insert: clubInsert }
      if (table === 'club_members') return { insert: memberInsert }
      throw new Error(`unexpected table ${table}`)
    })

    const { createClub } = useClubs()
    const result = await createClub({ name: 'Padel Brow', slug: 'padel-brow', description: '', visibility: 'public' }, 'u1')

    expect(clubInsert).toHaveBeenCalledWith({ name: 'Padel Brow', slug: 'padel-brow', description: '', visibility: 'public', owner_id: 'u1' })
    expect(memberInsert).toHaveBeenCalledWith({ club_id: 'c1', user_id: 'u1', role: 'owner' })
    expect(result).toEqual({ id: 'c1', name: 'Padel Brow' })
  })

  it('joinClub inserts a member row with role member', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { joinClub } = useClubs()
    await joinClub('c1', 'u2')

    expect(insert).toHaveBeenCalledWith({ club_id: 'c1', user_id: 'u2', role: 'member' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useClubs`
Expected: FAIL — `useClubs.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useClubs.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useClubs() {
  async function listClubs() {
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (error) throw error
    return data
  }

  async function searchClubs(query) {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
    if (error) throw error
    return data
  }

  async function createClub({ name, slug, description, visibility }, ownerId) {
    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .insert({ name, slug, description, visibility, owner_id: ownerId })
      .select()
      .single()
    if (clubErr) throw clubErr

    const { error: memberErr } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: ownerId, role: 'owner' })
    if (memberErr) throw memberErr

    return club
  }

  async function joinClub(clubId, userId) {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, user_id: userId, role: 'member' })
    if (error) throw error
  }

  async function leaveClub(clubId, userId) {
    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async function getMyMembership(clubId, userId) {
    const { data, error } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { listClubs, searchClubs, createClub, joinClub, leaveClub, getMyMembership }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useClubs`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useClubs.js src/composables/useClubs.spec.js
git commit -m "Add useClubs composable: list, search, create, join, leave"
```

---

### Task 8: Clubs view — browse, search, create

**Files:**
- Create: `src/views/ClubsView.vue`
- Test: `src/views/ClubsView.spec.js`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `useAuth().user`, `useClubs()` (Task 7).
- Produces: route named `clubs` at `/clubs`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/ClubsView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow', description: 'Our club', visibility: 'public' }])
const createClub = vi.fn().mockResolvedValue({ id: 'c2', name: 'New Club' })

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs, searchClubs: vi.fn(), createClub })),
}))

import ClubsView from './ClubsView.vue'

describe('ClubsView', () => {
  it('lists clubs on mount', async () => {
    const wrapper = mount(ClubsView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    expect(listClubs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Padel Brow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ClubsView`
Expected: FAIL — `ClubsView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/ClubsView.vue`:
```vue
<template>
  <section class="clubs-view">
    <div class="clubs-view__header">
      <h1>Clubs</h1>
      <LiButton @click="showCreateModal = true">Create club</LiButton>
    </div>

    <LiTextField v-model="query" placeholder="Search clubs..." @update:modelValue="handleSearch" />

    <LiEmptyState v-if="clubs.length === 0" title="No clubs found" icon="search" />
    <div v-else class="clubs-view__list">
      <LiCard v-for="club in clubs" :key="club.id" hover class="clubs-view__card">
        <router-link :to="`/clubs/${club.id}`">
          <h3>{{ club.name }}</h3>
          <p>{{ club.description }}</p>
        </router-link>
      </LiCard>
    </div>

    <LiModal v-model="showCreateModal" title="Create a club">
      <form @submit.prevent="handleCreate">
        <LiTextField v-model="newClub.name" label="Name" />
        <LiTextField v-model="newClub.slug" label="URL slug" placeholder="padel-brow" />
        <LiTextField v-model="newClub.description" type="area" label="Description" />
        <LiSelect
          v-model="newClub.visibility"
          label="Visibility"
          :options="[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]"
        />
        <LiButton type="submit" :loading="creating">Create</LiButton>
      </form>
    </LiModal>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiCard, LiEmptyState, LiModal, LiSelect } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'

const { user } = useAuth()
const { listClubs, searchClubs, createClub } = useClubs()

const clubs = ref([])
const query = ref('')
const showCreateModal = ref(false)
const creating = ref(false)
const newClub = ref({ name: '', slug: '', description: '', visibility: 'public' })

onMounted(async () => {
  clubs.value = await listClubs()
})

async function handleSearch(value) {
  clubs.value = value ? await searchClubs(value) : await listClubs()
}

async function handleCreate() {
  creating.value = true
  try {
    await createClub({ ...newClub.value }, user.value.id)
    showCreateModal.value = false
    newClub.value = { name: '', slug: '', description: '', visibility: 'public' }
    clubs.value = await listClubs()
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.clubs-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.clubs-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clubs-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add the import:
```js
import ClubsView from '../views/ClubsView.vue'
```
and inside `routes:`:
```js
    { path: '/clubs', name: 'clubs', component: ClubsView, meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/ClubsView.vue src/views/ClubsView.spec.js src/router/index.js
git commit -m "Add ClubsView with browse, search, and create"
```

---

### Task 9: Extend `useClubs.js` — get one club and list its members

**Files:**
- Modify: `src/composables/useClubs.js`
- Modify: `src/composables/useClubs.spec.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: adds `getClub(clubId): Promise<object|null>` and `listMembers(clubId): Promise<object[]>` to the object `useClubs()` returns — Task 10's `ClubDetailView` consumes both.

- [ ] **Step 1: Write the failing tests**

Append to `src/composables/useClubs.spec.js`:
```js
it('getClub fetches a single club by id', async () => {
  const single = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Padel Brow' }, error: null })
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  supabase.from.mockReturnValue({ select })

  const { getClub } = useClubs()
  const result = await getClub('c1')

  expect(eq).toHaveBeenCalledWith('id', 'c1')
  expect(result).toEqual({ id: 'c1', name: 'Padel Brow' })
})

it('listMembers fetches club_members joined with profile info, ordered by role', async () => {
  const order = vi.fn().mockResolvedValue({
    data: [{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }],
    error: null,
  })
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  supabase.from.mockReturnValue({ select })

  const { listMembers } = useClubs()
  const result = await listMembers('c1')

  expect(eq).toHaveBeenCalledWith('club_id', 'c1')
  expect(result).toEqual([{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useClubs`
Expected: FAIL — `getClub`/`listMembers` are not exported yet.

- [ ] **Step 3: Implement**

In `src/composables/useClubs.js`, add these two functions inside `useClubs()` (anywhere alongside the others) and add both to the final `return`:
```js
  async function getClub(clubId) {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single()
    if (error) throw error
    return data
  }

  async function listMembers(clubId) {
    const { data, error } = await supabase
      .from('club_members')
      .select('user_id, role, tags, joined_at, profiles(id, full_name, avatar_url)')
      .eq('club_id', clubId)
      .order('role')
    if (error) throw error
    return data
  }
```
And update the return statement to:
```js
  return { listClubs, searchClubs, createClub, joinClub, leaveClub, getMyMembership, getClub, listMembers }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useClubs`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useClubs.js src/composables/useClubs.spec.js
git commit -m "Extend useClubs with getClub and listMembers"
```

---

### Task 10: Club detail view — info, members, join/leave

**Files:**
- Create: `src/views/ClubDetailView.vue`
- Test: `src/views/ClubDetailView.spec.js`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `useAuth().user`, `useClubs()` (`getClub`, `listMembers`, `getMyMembership`, `joinClub`, `leaveClub`).
- Produces: route named `club-detail` at `/clubs/:id`, `meta: { requiresAuth: true }`. Exposes `club` and `myMembership` as reactive refs read by Task 12's `ClubMembershipsPanel`, which this view renders as a child component.

- [ ] **Step 1: Write the failing test**

`src/views/ClubDetailView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u2' } } })),
}))

const getClub = vi.fn().mockResolvedValue({ id: 'c1', name: 'Padel Brow', description: 'Our club' })
const listMembers = vi.fn().mockResolvedValue([{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }])
const getMyMembership = vi.fn().mockResolvedValue(null)
const joinClub = vi.fn().mockResolvedValue()
const leaveClub = vi.fn().mockResolvedValue()

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ getClub, listMembers, getMyMembership, joinClub, leaveClub })),
}))

vi.mock('../composables/useClubMemberships.js', () => ({
  useClubMemberships: vi.fn(() => ({ listMemberships: vi.fn().mockResolvedValue([]), createMembership: vi.fn(), subscribe: vi.fn() })),
}))

import ClubDetailView from './ClubDetailView.vue'

describe('ClubDetailView', () => {
  it('loads club info and members, and shows a Join button when not a member', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/clubs/:id', name: 'club-detail', component: ClubDetailView }],
    })
    router.push('/clubs/c1')
    await router.isReady()
    const wrapper = mount(ClubDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getClub).toHaveBeenCalledWith('c1')
    expect(listMembers).toHaveBeenCalledWith('c1')
    expect(wrapper.text()).toContain('Padel Brow')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ClubDetailView`
Expected: FAIL — `ClubDetailView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/ClubDetailView.vue`:
```vue
<template>
  <section v-if="club" class="club-detail-view">
    <div class="club-detail-view__header">
      <h1>{{ club.name }}</h1>
      <LiButton v-if="!myMembership" @click="handleJoin">Join</LiButton>
      <LiButton v-else variant="secondary" @click="handleLeave">Leave</LiButton>
    </div>
    <p>{{ club.description }}</p>

    <h2>Members</h2>
    <ul class="club-detail-view__members">
      <li v-for="member in members" :key="member.user_id">
        <span>{{ member.profiles.full_name }}</span>
        <LiBadge :label="member.role" variant="brand" />
      </li>
    </ul>

    <ClubMembershipsPanel
      :club-id="club.id"
      :can-manage="myMembership && ['owner', 'organizer'].includes(myMembership.role)"
    />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiButton, LiBadge } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import ClubMembershipsPanel from '../components/clubs/ClubMembershipsPanel.vue'

const route = useRoute()
const { user } = useAuth()
const { getClub, listMembers, getMyMembership, joinClub, leaveClub } = useClubs()

const club = ref(null)
const members = ref([])
const myMembership = ref(null)

async function loadMembership() {
  myMembership.value = await getMyMembership(route.params.id, user.value.id)
}

onMounted(async () => {
  club.value = await getClub(route.params.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
})

async function handleJoin() {
  await joinClub(route.params.id, user.value.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
}

async function handleLeave() {
  await leaveClub(route.params.id, user.value.id)
  members.value = await listMembers(route.params.id)
  await loadMembership()
}
</script>

<style scoped>
.club-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.club-detail-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.club-detail-view__members {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.club-detail-view__members li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s, 8px) 0;
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add the import:
```js
import ClubDetailView from '../views/ClubDetailView.vue'
```
and inside `routes:`:
```js
    { path: '/clubs/:id', name: 'club-detail', component: ClubDetailView, meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests to verify they pass**

Note: this test will still fail until Task 12 creates `ClubMembershipsPanel.vue` — that's expected and acceptable for this task's own commit, since Task 11 (composable) and Task 12 (component) come next in sequence. If your test runner errors on the missing import, create a minimal placeholder now so this task's own test passes in isolation:

`src/components/clubs/ClubMembershipsPanel.vue` (placeholder, replaced by Task 12):
```vue
<template>
  <div />
</template>

<script setup>
defineProps({ clubId: String, canManage: Boolean })
</script>
```

Run: `npm test -- ClubDetailView`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/ClubDetailView.vue src/views/ClubDetailView.spec.js src/router/index.js src/components/clubs/ClubMembershipsPanel.vue
git commit -m "Add ClubDetailView with member list and join/leave"
```

---

### Task 11: Club memberships composable (`useClubMemberships.js`)

**Files:**
- Create: `src/composables/useClubMemberships.js`
- Test: `src/composables/useClubMemberships.spec.js`

**Interfaces:**
- Produces: `useClubMemberships(): { listMemberships(clubId): Promise<object[]>, createMembership(clubId, { name, price, period, perks }): Promise<object>, subscribe(membershipId, userId, period): Promise<object> }`.

- [ ] **Step 1: Write the failing test**

`src/composables/useClubMemberships.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useClubMemberships } from './useClubMemberships.js'

describe('useClubMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listMemberships fetches tiers for a club', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'm1', name: 'Monthly Regular', price: 150000 }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listMemberships } = useClubMemberships()
    const result = await listMemberships('c1')

    expect(eq).toHaveBeenCalledWith('club_id', 'c1')
    expect(result).toEqual([{ id: 'm1', name: 'Monthly Regular', price: 150000 }])
  })

  it('createMembership inserts a new tier', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'm1', name: 'Monthly Regular' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createMembership } = useClubMemberships()
    const result = await createMembership('c1', { name: 'Monthly Regular', price: 150000, period: 'monthly', perks: { priority_rsvp: true } })

    expect(insert).toHaveBeenCalledWith({ club_id: 'c1', name: 'Monthly Regular', price: 150000, period: 'monthly', perks: { priority_rsvp: true } })
    expect(result).toEqual({ id: 'm1', name: 'Monthly Regular' })
  })

  it('subscribe inserts an active subscription with a computed expiry', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', status: 'active' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { subscribe } = useClubMemberships()
    const result = await subscribe('m1', 'u1', 'monthly')

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      membership_id: 'm1',
      user_id: 'u1',
      status: 'active',
    }))
    const insertedArg = insert.mock.calls[0][0]
    expect(typeof insertedArg.expires_at).toBe('string')
    expect(result).toEqual({ id: 's1', status: 'active' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useClubMemberships`
Expected: FAIL — `useClubMemberships.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useClubMemberships.js`:
```js
import { supabase } from '../lib/supabase.js'

const PERIOD_DAYS = { monthly: 30, quarterly: 90, annual: 365 }

function computeExpiry(period, from = new Date()) {
  const days = PERIOD_DAYS[period]
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function useClubMemberships() {
  async function listMemberships(clubId) {
    const { data, error } = await supabase
      .from('club_memberships')
      .select('*')
      .eq('club_id', clubId)
      .order('price')
    if (error) throw error
    return data
  }

  async function createMembership(clubId, { name, price, period, perks }) {
    const { data, error } = await supabase
      .from('club_memberships')
      .insert({ club_id: clubId, name, price, period, perks })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function subscribe(membershipId, userId, period) {
    const { data, error } = await supabase
      .from('club_membership_subscriptions')
      .insert({
        membership_id: membershipId,
        user_id: userId,
        status: 'active',
        expires_at: computeExpiry(period),
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { listMemberships, createMembership, subscribe }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useClubMemberships`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useClubMemberships.js src/composables/useClubMemberships.spec.js
git commit -m "Add useClubMemberships composable: list, create tiers, subscribe"
```

---

### Task 12: Club memberships panel component

**Files:**
- Modify: `src/components/clubs/ClubMembershipsPanel.vue` (replace Task 10's placeholder)
- Create: `src/components/clubs/ClubMembershipsPanel.spec.js`

**Interfaces:**
- Consumes: `useAuth().user`, `useClubMemberships()` (Task 11).
- Props: `clubId: String` (required), `canManage: Boolean` (whether to show the "add tier" form — passed in by `ClubDetailView` based on the viewer's role).

- [ ] **Step 1: Write the failing test**

`src/components/clubs/ClubMembershipsPanel.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const listMemberships = vi.fn().mockResolvedValue([{ id: 'm1', name: 'Monthly Regular', price: 150000, period: 'monthly' }])
const createMembership = vi.fn().mockResolvedValue({})
const subscribe = vi.fn().mockResolvedValue({})

vi.mock('../../composables/useClubMemberships.js', () => ({
  useClubMemberships: vi.fn(() => ({ listMemberships, createMembership, subscribe })),
}))

import ClubMembershipsPanel from './ClubMembershipsPanel.vue'

describe('ClubMembershipsPanel', () => {
  it('lists tiers and shows a Subscribe button per tier', async () => {
    const wrapper = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: false } })
    await flushPromises()
    expect(listMemberships).toHaveBeenCalledWith('c1')
    expect(wrapper.text()).toContain('Monthly Regular')
    expect(wrapper.text()).toContain('Subscribe')
  })

  it('shows an add-tier form only when canManage is true', async () => {
    const wrapperReadOnly = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: false } })
    await flushPromises()
    expect(wrapperReadOnly.find('form').exists()).toBe(false)

    const wrapperManager = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: true } })
    await flushPromises()
    expect(wrapperManager.find('form').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ClubMembershipsPanel`
Expected: FAIL — the placeholder from Task 10 renders neither tiers nor a form.

- [ ] **Step 3: Implement**

`src/components/clubs/ClubMembershipsPanel.vue`:
```vue
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
import { LiCard, LiButton, LiTextField, LiSelect, LiEmptyState } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubMemberships } from '../../composables/useClubMemberships.js'

const props = defineProps({
  clubId: { type: String, required: true },
  canManage: { type: Boolean, default: false },
})

const { user } = useAuth()
const { listMemberships, createMembership, subscribe } = useClubMemberships()

const memberships = ref([])
const creating = ref(false)
const newTier = ref({ name: '', price: 0, period: 'monthly' })

onMounted(async () => {
  memberships.value = await listMemberships(props.clubId)
})

async function handleSubscribe(tier) {
  await subscribe(tier.id, user.value.id, tier.period)
}

async function handleCreate() {
  creating.value = true
  try {
    await createMembership(props.clubId, { ...newTier.value })
    newTier.value = { name: '', price: 0, period: 'monthly' }
    memberships.value = await listMemberships(props.clubId)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ClubMembershipsPanel`
Expected: PASS — 2 tests. Also re-run the full suite since `ClubDetailView.spec.js` (Task 10) mocks `useClubMemberships.js` and stubs this component indirectly:

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/clubs/ClubMembershipsPanel.vue src/components/clubs/ClubMembershipsPanel.spec.js
git commit -m "Implement ClubMembershipsPanel: list tiers, subscribe, owner add-tier form"
```

---

### Task 13: Follows composable (`useFollows.js`)

**Files:**
- Create: `src/composables/useFollows.js`
- Test: `src/composables/useFollows.spec.js`

**Interfaces:**
- Produces: `useFollows(): { listFollowees(userId): Promise<object[]>, follow(followerId, followeeId): Promise<void>, unfollow(followerId, followeeId): Promise<void> }`.

- [ ] **Step 1: Write the failing test**

`src/composables/useFollows.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useFollows } from './useFollows.js'

describe('useFollows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listFollowees returns the followed profiles', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ followee_id: 'u2', profiles: { id: 'u2', full_name: 'Rina' } }],
      error: null,
    })
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listFollowees } = useFollows()
    const result = await listFollowees('u1')

    expect(supabase.from).toHaveBeenCalledWith('follows')
    expect(eq).toHaveBeenCalledWith('follower_id', 'u1')
    expect(result).toEqual([{ id: 'u2', full_name: 'Rina' }])
  })

  it('follow inserts a follows row', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { follow } = useFollows()
    await follow('u1', 'u2')

    expect(insert).toHaveBeenCalledWith({ follower_id: 'u1', followee_id: 'u2' })
  })

  it('unfollow deletes the matching follows row', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const del = vi.fn(() => ({ eq: eq1 }))
    supabase.from.mockReturnValue({ delete: del })

    const { unfollow } = useFollows()
    await unfollow('u1', 'u2')

    expect(eq1).toHaveBeenCalledWith('follower_id', 'u1')
    expect(eq2).toHaveBeenCalledWith('followee_id', 'u2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useFollows`
Expected: FAIL — `useFollows.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useFollows.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useFollows() {
  async function listFollowees(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('followee_id, profiles!follows_followee_id_fkey(id, full_name, avatar_url, skill_level, home_area)')
      .eq('follower_id', userId)
    if (error) throw error
    return data.map((row) => row.profiles)
  }

  async function follow(followerId, followeeId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followee_id: followeeId })
    if (error) throw error
  }

  async function unfollow(followerId, followeeId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
    if (error) throw error
  }

  return { listFollowees, follow, unfollow }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useFollows`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useFollows.js src/composables/useFollows.spec.js
git commit -m "Add useFollows composable: list followees, follow, unfollow"
```

---

### Task 14: Player discovery composable (`usePlayerDiscovery.js`)

**Files:**
- Create: `src/composables/usePlayerDiscovery.js`
- Test: `src/composables/usePlayerDiscovery.spec.js`

**Interfaces:**
- Produces: `usePlayerDiscovery(): { searchPlayers({ minLevel, maxLevel, homeArea, currentUserId }): Promise<object[]> }`. Excludes the searcher's own profile and anyone the searcher has blocked (`public.blocks` where `blocker_id = currentUserId`).

- [ ] **Step 1: Write the failing test**

`src/composables/usePlayerDiscovery.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { usePlayerDiscovery } from './usePlayerDiscovery.js'

describe('usePlayerDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes the current user and anyone they have blocked, applies level/area filters', async () => {
    const blocksEq = vi.fn().mockResolvedValue({ data: [{ blocked_id: 'u3' }], error: null })
    const blocksSelect = vi.fn(() => ({ eq: blocksEq }))

    const order = vi.fn().mockResolvedValue({ data: [{ id: 'u2', full_name: 'Rina' }], error: null })
    const not = vi.fn(() => ({ order }))
    const ilike = vi.fn(() => ({ not }))
    const lte = vi.fn(() => ({ ilike }))
    const gte = vi.fn(() => ({ lte }))
    const neq = vi.fn(() => ({ gte }))
    const profilesSelect = vi.fn(() => ({ neq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'blocks') return { select: blocksSelect }
      if (table === 'profiles') return { select: profilesSelect }
      throw new Error(`unexpected table ${table}`)
    })

    const { searchPlayers } = usePlayerDiscovery()
    const result = await searchPlayers({ minLevel: 2, maxLevel: 4, homeArea: 'Jakarta', currentUserId: 'u1' })

    expect(blocksEq).toHaveBeenCalledWith('blocker_id', 'u1')
    expect(neq).toHaveBeenCalledWith('id', 'u1')
    expect(gte).toHaveBeenCalledWith('skill_level', 2)
    expect(lte).toHaveBeenCalledWith('skill_level', 4)
    expect(ilike).toHaveBeenCalledWith('home_area', '%Jakarta%')
    expect(not).toHaveBeenCalledWith('id', 'in', '(u3)')
    expect(result).toEqual([{ id: 'u2', full_name: 'Rina' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- usePlayerDiscovery`
Expected: FAIL — `usePlayerDiscovery.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/usePlayerDiscovery.js`:
```js
import { supabase } from '../lib/supabase.js'

export function usePlayerDiscovery() {
  async function searchPlayers({ minLevel, maxLevel, homeArea, currentUserId } = {}) {
    const { data: blocked, error: blockErr } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId)
    if (blockErr) throw blockErr
    const blockedIds = blocked.map((b) => b.blocked_id)

    let query = supabase.from('profiles').select('*').neq('id', currentUserId)
    if (minLevel != null) query = query.gte('skill_level', minLevel)
    if (maxLevel != null) query = query.lte('skill_level', maxLevel)
    if (homeArea) query = query.ilike('home_area', `%${homeArea}%`)
    if (blockedIds.length > 0) query = query.not('id', 'in', `(${blockedIds.join(',')})`)

    const { data, error } = await query.order('full_name')
    if (error) throw error
    return data
  }

  return { searchPlayers }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- usePlayerDiscovery`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePlayerDiscovery.js src/composables/usePlayerDiscovery.spec.js
git commit -m "Add usePlayerDiscovery composable, respecting blocks"
```

---

### Task 15: Network view — followed players + player discovery

**Files:**
- Create: `src/views/NetworkView.vue`
- Test: `src/views/NetworkView.spec.js`
- Modify: `src/router/index.js`

**Interfaces:**
- Consumes: `useAuth().user`, `useFollows()` (Task 13), `usePlayerDiscovery()` (Task 14).
- Produces: route named `network` at `/network`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/NetworkView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const listFollowees = vi.fn().mockResolvedValue([{ id: 'u2', full_name: 'Rina' }])
const follow = vi.fn().mockResolvedValue()
const unfollow = vi.fn().mockResolvedValue()

vi.mock('../composables/useFollows.js', () => ({
  useFollows: vi.fn(() => ({ listFollowees, follow, unfollow })),
}))

const searchPlayers = vi.fn().mockResolvedValue([{ id: 'u3', full_name: 'Dio', skill_level: 3 }])

vi.mock('../composables/usePlayerDiscovery.js', () => ({
  usePlayerDiscovery: vi.fn(() => ({ searchPlayers })),
}))

import NetworkView from './NetworkView.vue'

describe('NetworkView', () => {
  it('lists followed players on mount', async () => {
    const wrapper = mount(NetworkView)
    await flushPromises()
    expect(listFollowees).toHaveBeenCalledWith('u1')
    expect(wrapper.text()).toContain('Rina')
  })

  it('searches players and shows a Follow button for each result', async () => {
    const wrapper = mount(NetworkView)
    await flushPromises()
    await wrapper.find('input[data-testid="discovery-search"]').setValue('Dio')
    await wrapper.find('form[data-testid="discovery-form"]').trigger('submit')
    await flushPromises()
    expect(searchPlayers).toHaveBeenCalledWith(expect.objectContaining({ currentUserId: 'u1' }))
    expect(wrapper.text()).toContain('Dio')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- NetworkView`
Expected: FAIL — `NetworkView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/NetworkView.vue`:
```vue
<template>
  <section class="network-view">
    <h1>My Network</h1>

    <div class="network-view__section">
      <h2>Following</h2>
      <LiEmptyState v-if="followees.length === 0" title="You're not following anyone yet" icon="person" />
      <ul v-else class="network-view__list">
        <li v-for="person in followees" :key="person.id">
          <span>{{ person.full_name }}</span>
          <LiButton variant="secondary" size="sm" @click="handleUnfollow(person.id)">Unfollow</LiButton>
        </li>
      </ul>
    </div>

    <div class="network-view__section">
      <h2>Discover players</h2>
      <form data-testid="discovery-form" @submit.prevent="handleSearch">
        <LiTextField data-testid="discovery-search" v-model="searchArea" placeholder="Search by area..." />
        <LiButton type="submit">Search</LiButton>
      </form>
      <ul class="network-view__list">
        <li v-for="person in searchResults" :key="person.id">
          <span>{{ person.full_name }} (level {{ person.skill_level }})</span>
          <LiButton size="sm" @click="handleFollow(person.id)">Follow</LiButton>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiEmptyState } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useFollows } from '../composables/useFollows.js'
import { usePlayerDiscovery } from '../composables/usePlayerDiscovery.js'

const { user } = useAuth()
const { listFollowees, follow, unfollow } = useFollows()
const { searchPlayers } = usePlayerDiscovery()

const followees = ref([])
const searchArea = ref('')
const searchResults = ref([])

onMounted(async () => {
  followees.value = await listFollowees(user.value.id)
})

async function handleSearch() {
  searchResults.value = await searchPlayers({ homeArea: searchArea.value, currentUserId: user.value.id })
}

async function handleFollow(followeeId) {
  await follow(user.value.id, followeeId)
  followees.value = await listFollowees(user.value.id)
}

async function handleUnfollow(followeeId) {
  await unfollow(user.value.id, followeeId)
  followees.value = await listFollowees(user.value.id)
}
</script>

<style scoped>
.network-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.network-view__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.network-view__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.network-view__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

form {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add the import:
```js
import NetworkView from '../views/NetworkView.vue'
```
and inside `routes:`:
```js
    { path: '/network', name: 'network', component: NetworkView, meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — full suite green.

- [ ] **Step 6: Verify the build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/views/NetworkView.vue src/views/NetworkView.spec.js src/router/index.js
git commit -m "Add NetworkView: followed players and player discovery"
```

---

## Self-Review Notes

- **Spec coverage:** auth (email + Google) → Tasks 1-3; profile view/edit → Tasks 4-5; auth-aware nav → Task 6; create/browse/join clubs with roles → Tasks 7-10; club memberships/recurring passes (tier CRUD + subscribe, payment-proof deferred to Phase 5 per the design spec's own phasing) → Tasks 11-12; My Network (follow/unfollow — meets-feed sub-feature explicitly deferred to Phase 3 since meets don't exist yet) → Task 13, 15; player discovery respecting blocks → Task 14, 15.
- **Out of scope, confirmed intentionally deferred:** meets-feed inside My Network (needs Phase 3's `meets` UI), payment-proof upload for membership subscriptions (needs Phase 5's Storage-backed proof flow — this plan's `subscribe()` just creates an `active` row directly, matching how the design spec frames Phase 2's membership scope).
- **Router guard reuse:** the generic `meta.requiresAuth` mechanism built in Task 2 is reused by every subsequent protected route (Tasks 5, 8, 10, 15) with zero additional guard code — confirmed no route-specific auth logic was duplicated.
- **Type/interface consistency:** every composable that touches `club_members` uses the same role strings (`'owner' | 'organizer' | 'member'`) as the Phase 1 migration's `check` constraint; every composable that inserts touches only columns that exist per the Phase 1 schema (cross-checked against `docs/superpowers/plans/2026-07-11-phase-1-foundation.md`'s migration SQL for `profiles`, `clubs`, `club_members`, `club_memberships`, `club_membership_subscriptions`, `follows`, `blocks`).
