# UI/UX Rework — Phase 2: Core/Social + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the 7 "Core/Social + Auth" views (ClubsView, ClubDetailView, NetworkView, ProfileView, LoginView, SignUpView, FeedView) to the same visual bar as the landing page and the Phase-1-rebuilt `AppLayout`, using the `Li*` design-system components and the `LiPageHeader` component built in Phase 1 — plus fix the one navigation dead-end this group contains (`ClubDetailView` never links to its own club feed).

**Architecture:** Each view is an independent, self-contained task — no new shared components are created in this phase (Phase 1 already built everything needed: `LiPageHeader`, `useViewport`). Per the established restyle pattern: raw `<h1>` blocks become `LiPageHeader` (with an `#actions` slot for header-row buttons), raw `<ul><li>` lists become `LiCard`/`LiListTile`, and form-panel `LiCard`s become `LiGlassCard` (matching the spec's "forms sit in a glass panel" rule). `ClubsView`'s create-club dialog swaps between `LiModal` (desktop) and `LiBottomSheet` (mobile) via `useViewport`, per the mobile-native requirement.

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, the Lithium design-system (`src/design-system/components/`), plain CSS custom properties.

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-14-ui-ux-consistency-rework-design.md`. This phase implements §3 (per-view-type restyle pattern) and one item from §5 (the `ClubDetailView` → club-feed nav-link fix) for the 7 views listed above.
- **No business-logic changes.** Every composable call (`useClubs`, `useFollows`, `usePlayerDiscovery`, `useProfile`, `useAuth`, `useFeed`, `useStorage`) is used with the exact same function names, arguments, and call sites as today — only `<template>`/`<style>` (and, for `ClubDetailView`, one new `goToFeed()` method that calls existing router APIs) change.
- **Preserve every existing spec assertion exactly.** Each task lists the exact `wrapper.text()`/selector/button-text assertions from that view's current spec file that must keep passing unmodified. Three of the seven views (`ProfileView`, `LoginView`, `SignUpView`) need **zero** spec file changes — pure component swaps. `NetworkView` and `FeedView` also need zero spec changes despite restructuring their lists (confirmed: `LiTextField type="area"` still renders a real `<textarea>` element, and `LiListTile`'s `title` prop renders as plain text, so existing `wrapper.text()`/`wrapper.find('textarea')` assertions keep working). Only `ClubsView` and `ClubDetailView` get new tests added (for genuinely new behavior — the modal/bottom-sheet swap and the club-feed link).
- **Breakpoint convention:** literal `480px`/`768px`/`1024px` only, per `tokens.css`'s comment block — this phase doesn't need new `@media` rules in any of the 7 views, because `LiPageHeader`'s own `flex-wrap: wrap` (already built in Phase 1) handles header-row wrapping on narrow screens, and the existing card grids/centered narrow forms are already responsive.
- **No new npm dependencies, no new design-system components.** Everything needed (`LiPageHeader`, `LiGlassCard`, `LiListTile`, `LiCard`, `LiBottomSheet`, `LiModal`, `LiRevealOnScroll`, `useViewport`) already exists from Phase 1 or earlier.
- **Dark mode:** only semantic tokens (`--color-on-surface`, `--color-gray-*`, etc.) — no new hardcoded hex colors.
- **`LiModal`/`LiBottomSheet` Teleport-testing rule:** both render via `<Teleport to="body">`. Any test asserting their content must mount with `attachTo: document.body` and query `document.body`, not `wrapper.text()`/`wrapper.html()` — confirmed necessary in Phase 1's `AppLayout` work.
- **Component fallthrough:** `LiCard`/`LiGlassCard`'s root `<div>` has no `inheritAttrs: false`, so passing `class="my-custom-class"` on either component merges onto its root element (this is the existing, already-used pattern in `ClubsView`/`ProfileView` today — swapping `LiCard` → `LiGlassCard` while keeping the same custom class is safe).

## File Structure

- Modify: `src/views/auth/LoginView.vue` (LiCard → LiGlassCard only)
- Modify: `src/views/auth/SignUpView.vue` (LiCard → LiGlassCard only)
- Modify: `src/views/ProfileView.vue` (LiCard → LiGlassCard only)
- Modify: `src/views/NetworkView.vue` (LiPageHeader + LiCard/LiListTile lists)
- Modify: `src/views/feed/FeedView.vue` (LiPageHeader + LiGlassCard composer + LiTextField + LiRevealOnScroll list)
- Modify: `src/views/ClubsView.vue` + `src/views/ClubsView.spec.js` (LiPageHeader + LiRevealOnScroll grid + mobile modal/bottom-sheet swap)
- Modify: `src/views/ClubDetailView.vue` + `src/views/ClubDetailView.spec.js` (LiPageHeader + LiCard/LiListTile members + club-feed nav-link fix)

---

### Task 1: LoginView — LiCard → LiGlassCard

**Files:**
- Modify: `src/views/auth/LoginView.vue` (full file)
- Test: `src/views/auth/LoginView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiGlassCard` (existing, from `../../design-system/components/index.js`).

**Preserve exactly:** `wrapper.text()` contains `'Sign in to PADEL BROW'`; `wrapper.findAll('input').length >= 2`.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/auth/LoginView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/auth/LoginView.vue` in full**

```vue
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
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/auth/LoginView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/auth/LoginView.vue
git commit -m "feat(ui-rework): restyle LoginView with LiGlassCard"
```

---

### Task 2: SignUpView — LiCard → LiGlassCard

**Files:**
- Modify: `src/views/auth/SignUpView.vue` (full file)
- Test: `src/views/auth/SignUpView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiGlassCard` (existing).

**Preserve exactly:** `wrapper.text()` contains `'Create your account'`; `wrapper.findAll('input').length >= 3`.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/auth/SignUpView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/auth/SignUpView.vue` in full**

```vue
<template>
  <section class="signup-view">
    <LiGlassCard class="signup-view__card">
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
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LiGlassCard, LiTextField, LiButton } from '../../design-system/components/index.js'
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

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/auth/SignUpView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/auth/SignUpView.vue
git commit -m "feat(ui-rework): restyle SignUpView with LiGlassCard"
```

---

### Task 3: ProfileView — LiCard → LiGlassCard

**Files:**
- Modify: `src/views/ProfileView.vue` (full file)
- Test: `src/views/ProfileView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiGlassCard` (existing).

**Preserve exactly:** `fetchProfile` is called with `'u1'` on mount (the spec's only assertion).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/ProfileView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/ProfileView.vue` in full**

```vue
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
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/ProfileView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/ProfileView.vue
git commit -m "feat(ui-rework): restyle ProfileView with LiGlassCard"
```

---

### Task 4: NetworkView — LiPageHeader + LiCard/LiListTile lists

**Files:**
- Modify: `src/views/NetworkView.vue` (full file)
- Test: `src/views/NetworkView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile` (existing).

**Preserve exactly:**
- `wrapper.text()` contains `'Rina'` (followee name) after mount.
- `wrapper.find('input[placeholder="Search by area..."]')` exists and is settable.
- `wrapper.find('form[data-testid="discovery-form"]')` exists and triggers `handleSearch` on submit.
- `wrapper.text()` contains `'Dio'` (search result name) after search.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/NetworkView.spec.js`
Expected: PASS (2 tests)

- [ ] **Step 2: Replace `src/views/NetworkView.vue` in full**

```vue
<template>
  <section class="network-view">
    <LiPageHeader title="My Network" subtitle="Players you follow, and new players to discover." />

    <div class="network-view__section">
      <h2>Following</h2>
      <LiEmptyState v-if="followees.length === 0" title="You're not following anyone yet" icon="person" />
      <LiCard v-else flush>
        <LiListTile v-for="person in followees" :key="person.id" :title="person.full_name">
          <template #trailing>
            <LiButton variant="secondary" size="sm" @click="handleUnfollow(person.id)">Unfollow</LiButton>
          </template>
        </LiListTile>
      </LiCard>
    </div>

    <div class="network-view__section">
      <h2>Discover players</h2>
      <form data-testid="discovery-form" @submit.prevent="handleSearch">
        <LiTextField v-model="searchArea" placeholder="Search by area..." />
        <LiButton type="submit">Search</LiButton>
      </form>
      <LiCard v-if="searchResults.length" flush>
        <LiListTile
          v-for="person in searchResults"
          :key="person.id"
          :title="person.full_name"
          :subtitle="`Level ${person.skill_level}`"
        >
          <template #trailing>
            <LiButton size="sm" @click="handleFollow(person.id)">Follow</LiButton>
          </template>
        </LiListTile>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiEmptyState, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useFollows } from '../composables/useFollows.js'
import { usePlayerDiscovery } from '../composables/usePlayerDiscovery.js'

const { user } = useAuth()
const { listFollowees, follow, unfollow } = useFollows()
const { searchPlayers } = usePlayerDiscovery()
const toast = useToast()

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
  try {
    await follow(user.value.id, followeeId)
    followees.value = await listFollowees(user.value.id)
  } catch (err) {
    toast.error(err.message || 'Could not follow that player.')
  }
}

async function handleUnfollow(followeeId) {
  try {
    await unfollow(user.value.id, followeeId)
    followees.value = await listFollowees(user.value.id)
  } catch (err) {
    toast.error(err.message || 'Could not unfollow that player.')
  }
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

form {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/NetworkView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/NetworkView.vue
git commit -m "feat(ui-rework): restyle NetworkView with LiPageHeader + LiListTile"
```

---

### Task 5: FeedView — LiPageHeader + LiGlassCard composer + LiRevealOnScroll list

**Files:**
- Modify: `src/views/feed/FeedView.vue` (full file)
- Test: `src/views/feed/FeedView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiGlassCard`, `LiRevealOnScroll`, `LiTextField` (existing).

**Preserve exactly:**
- `wrapper.text()` contains `'Hello'` (post caption) and `'Feed'` (page title) after mount.
- `wrapper.find('textarea')` exists and is settable (confirmed: `LiTextField type="area"` renders a real `<textarea class="li-textfield-textarea">` element, so this selector still resolves).
- A `<button>` whose text matches `/^post$/i` exists and calls `createPost` with `{ caption: 'New post', mediaUrls: [] }` on click.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/feed/FeedView.spec.js`
Expected: PASS (2 tests)

- [ ] **Step 2: Replace `src/views/feed/FeedView.vue` in full**

```vue
<template>
  <section class="feed-view">
    <LiPageHeader :title="clubId ? 'Club feed' : 'Feed'" />

    <LiGlassCard class="feed-view__composer">
      <LiTextField v-model="caption" type="area" placeholder="Share something…" />
      <input type="file" multiple accept="image/*,video/*" class="feed-view__file" @change="onFiles" />
      <LiButton :loading="posting" @click="handlePost">Post</LiButton>
    </LiGlassCard>

    <LiEmptyState v-if="posts.length === 0" title="No posts yet" icon="feed" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="feed-view__list">
        <PostCard v-for="p in posts" :key="p.id" :post="p" @deleted="onDeleted" />
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiGlassCard, LiButton, LiEmptyState, LiPageHeader, LiRevealOnScroll, LiTextField, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useFeed } from '../../composables/useFeed.js'
import { useStorage } from '../../composables/useStorage.js'
import PostCard from '../../components/feed/PostCard.vue'

const props = defineProps({ clubId: { type: String, default: '' } })
const { user } = useAuth()
const { listFeed, createPost } = useFeed()
const { uploadFeedMedia } = useStorage()
const toast = useToast()

const caption = ref('')
const files = ref([])
const posts = ref([])
const posting = ref(false)

async function load() {
  try {
    posts.value = await listFeed(props.clubId || undefined)
  } catch (err) {
    toast.error(err.message || 'Could not load the feed.')
  }
}

onMounted(load)

function onFiles(e) {
  files.value = Array.from(e.target.files || [])
}

async function handlePost() {
  if (!caption.value.trim() && files.value.length === 0) return
  posting.value = true
  try {
    const mediaUrls = []
    for (const f of files.value) {
      mediaUrls.push(await uploadFeedMedia(f))
    }
    const post = await createPost({ caption: caption.value.trim(), mediaUrls, clubId: props.clubId || undefined }, user.value.id)
    posts.value.unshift(post)
    caption.value = ''
    files.value = []
  } catch (err) {
    toast.error(err.message || 'Could not create the post.')
  } finally {
    posting.value = false
  }
}

function onDeleted(postId) {
  posts.value = posts.value.filter((p) => p.id !== postId)
}
</script>

<style scoped>
.feed-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); max-width: 640px; margin: 0 auto; }
.feed-view__composer { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.feed-view__file { font-size: var(--text-xs, 14px); }
.feed-view__list { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/feed/FeedView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/feed/FeedView.vue
git commit -m "feat(ui-rework): restyle FeedView with LiPageHeader + LiGlassCard composer"
```

---

### Task 6: ClubsView — LiPageHeader + LiRevealOnScroll grid + mobile modal/bottom-sheet swap

**Files:**
- Modify: `src/views/ClubsView.vue` (full file)
- Modify: `src/views/ClubsView.spec.js` (full file — adds 2 new tests to the existing 1)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiRevealOnScroll`, `LiBottomSheet` (existing design-system components), `useViewport()` returning `{ isMobile: Ref<boolean> }` (Phase 1 Task 1 — exact shape, consumed here for the first time in the app).

**Preserve exactly:** `listClubs` is called on mount; `wrapper.text()` contains `'Padel Brow'` (club name, rendered inside the `router-link` default slot via the existing `RouterLinkStub`).

**New behavior under test:** the create-club dialog renders as `LiModal` (`.li-modal-overlay` in `document.body`) when `isMobile` is `false`, and as `LiBottomSheet` (`.li-bottomsheet-overlay` in `document.body`) when `isMobile` is `true`.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/ClubsView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Write the two new failing tests**

Replace `src/views/ClubsView.spec.js` in full:

```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow', description: 'Our club', visibility: 'public' }])
const createClub = vi.fn().mockResolvedValue({ id: 'c2', name: 'New Club' })

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs, searchClubs: vi.fn(), createClub })),
}))

vi.mock('../composables/useViewport.js', () => ({
  useViewport: vi.fn(() => ({ isMobile: ref(false) })),
}))

import ClubsView from './ClubsView.vue'
import { useViewport } from '../composables/useViewport.js'

// Renders slot content so club name/description are visible in wrapper.text()
// — the default `RouterLink: true` stub does not render its default slot
// (this bit Task 6's AppLayout test the same way; same fix here).
const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('ClubsView', () => {
  it('lists clubs on mount', async () => {
    const wrapper = mount(ClubsView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listClubs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Padel Brow')
  })

  it('shows the create-club form in a centered LiModal on desktop', async () => {
    useViewport.mockReturnValue({ isMobile: ref(false) })
    const wrapper = mount(ClubsView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
      attachTo: document.body,
    })
    await flushPromises()
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create club/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()
    // LiModal/LiBottomSheet render via <Teleport to="body">, so assert
    // against document.body, not wrapper.text()/wrapper.find().
    expect(document.body.querySelector('.li-modal-overlay')).toBeTruthy()
    expect(document.body.querySelector('.li-bottomsheet-overlay')).toBeFalsy()
    wrapper.unmount()
  })

  it('shows the create-club form in a mobile LiBottomSheet when isMobile is true', async () => {
    useViewport.mockReturnValue({ isMobile: ref(true) })
    const wrapper = mount(ClubsView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
      attachTo: document.body,
    })
    await flushPromises()
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create club/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()
    expect(document.body.querySelector('.li-bottomsheet-overlay')).toBeTruthy()
    expect(document.body.querySelector('.li-modal-overlay')).toBeFalsy()
    wrapper.unmount()
  })
})
```

- [ ] **Step 3: Run the spec to verify the 2 new tests fail**

Run: `npx vitest run src/views/ClubsView.spec.js`
Expected: FAIL — `Failed to resolve import '../composables/useViewport.js'` from the mock is fine (file exists from Phase 1), but the component doesn't yet render `LiPageHeader`/`LiRevealOnScroll`/the conditional `LiModal`/`LiBottomSheet` swap, so `.li-modal-overlay`/`.li-bottomsheet-overlay` won't appear as expected — the two new tests fail because `ClubsView.vue` still hardcodes `<LiModal>` only.

- [ ] **Step 4: Replace `src/views/ClubsView.vue` in full**

```vue
<template>
  <section class="clubs-view">
    <LiPageHeader title="Clubs" subtitle="Find or start a padel community near you.">
      <template #actions>
        <LiButton @click="showCreateModal = true">Create club</LiButton>
      </template>
    </LiPageHeader>

    <LiTextField v-model="query" placeholder="Search clubs..." @update:modelValue="handleSearch" />

    <LiEmptyState v-if="clubs.length === 0" title="No clubs found" icon="search" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="clubs-view__list">
        <LiCard v-for="club in clubs" :key="club.id" hover class="clubs-view__card">
          <router-link :to="`/clubs/${club.id}`">
            <h3>{{ club.name }}</h3>
            <p>{{ club.description }}</p>
          </router-link>
        </LiCard>
      </div>
    </LiRevealOnScroll>

    <component :is="isMobile ? LiBottomSheet : LiModal" v-model="showCreateModal" title="Create a club">
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
    </component>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiTextField, LiCard, LiEmptyState, LiModal, LiBottomSheet, LiSelect, LiPageHeader, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import { useViewport } from '../composables/useViewport.js'

const { user } = useAuth()
const { listClubs, searchClubs, createClub } = useClubs()
const toast = useToast()
const { isMobile } = useViewport()

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
  } catch (err) {
    toast.error(err.message || 'Could not create the club.')
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

- [ ] **Step 5: Run the spec to verify all 3 tests pass**

Run: `npx vitest run src/views/ClubsView.spec.js`
Expected: PASS (3 tests), output pristine.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/ClubsView.vue src/views/ClubsView.spec.js
git commit -m "feat(ui-rework): restyle ClubsView + mobile bottom-sheet create-club dialog"
```

---

### Task 7: ClubDetailView — LiPageHeader + LiCard/LiListTile members + club-feed nav-link fix

**Files:**
- Modify: `src/views/ClubDetailView.vue` (full file)
- Modify: `src/views/ClubDetailView.spec.js` (full file — adds 1 new test to the existing 1)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile` (existing design-system components), `useRouter()` (existing vue-router API, newly used in this file for the club-feed nav-link fix).

**Preserve exactly:** `getClub` called with `'c1'`; `listMembers` called with `'c1'`; `wrapper.text()` contains `'Padel Brow'`, `'Fano'`, and `'Join'`.

**Nav-fix context (spec §5, item 3):** `router/index.js` registers a `club-feed` route (`/clubs/:id/feed`, name `club-feed`) that `ClubDetailView` never links to — it's currently reachable only by typing the URL. This task adds a "Club feed" button.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/ClubDetailView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Write the new failing test**

Replace `src/views/ClubDetailView.spec.js` in full:

```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
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

  it('navigates to the club feed when "Club feed" is clicked', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/clubs/:id', name: 'club-detail', component: ClubDetailView },
        { path: '/clubs/:id/feed', name: 'club-feed', component: { template: '<div>stub feed</div>' } },
      ],
    })
    router.push('/clubs/c1')
    await router.isReady()
    const wrapper = mount(ClubDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const feedBtn = wrapper.findAll('button').find((b) => b.text().match(/club feed/i))
    expect(feedBtn).toBeTruthy()
    await feedBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/clubs/c1/feed')
  })
})
```

- [ ] **Step 3: Run the spec to verify the new test fails**

Run: `npx vitest run src/views/ClubDetailView.spec.js`
Expected: FAIL on the second test — no button matching `/club feed/i` exists yet (`ClubDetailView.vue` doesn't render one).

- [ ] **Step 4: Replace `src/views/ClubDetailView.vue` in full**

```vue
<template>
  <section v-if="club" class="club-detail-view">
    <LiPageHeader :title="club.name" :subtitle="club.description">
      <template #actions>
        <LiButton variant="secondary" @click="goToFeed">Club feed</LiButton>
        <LiButton v-if="!myMembership" @click="handleJoin">Join</LiButton>
        <LiButton v-else variant="secondary" @click="handleLeave">Leave</LiButton>
      </template>
    </LiPageHeader>

    <h2>Members</h2>
    <LiCard flush>
      <LiListTile v-for="member in members" :key="member.user_id" :title="member.profiles.full_name">
        <template #trailing>
          <LiBadge :label="member.role" variant="brand" />
        </template>
      </LiListTile>
    </LiCard>

    <ClubMembershipsPanel
      :club-id="club.id"
      :can-manage="myMembership && ['owner', 'organizer'].includes(myMembership.role)"
    />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useClubs } from '../composables/useClubs.js'
import ClubMembershipsPanel from '../components/clubs/ClubMembershipsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getClub, listMembers, getMyMembership, joinClub, leaveClub } = useClubs()
const toast = useToast()

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
  try {
    await joinClub(route.params.id, user.value.id)
    members.value = await listMembers(route.params.id)
    await loadMembership()
  } catch (err) {
    toast.error(err.message || 'Could not join the club.')
  }
}

async function handleLeave() {
  try {
    await leaveClub(route.params.id, user.value.id)
    members.value = await listMembers(route.params.id)
    await loadMembership()
  } catch (err) {
    toast.error(err.message || 'Could not leave the club.')
  }
}

function goToFeed() {
  router.push({ name: 'club-feed', params: { id: route.params.id } })
}
</script>

<style scoped>
.club-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 5: Run the spec to verify both tests pass**

Run: `npx vitest run src/views/ClubDetailView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/ClubDetailView.vue src/views/ClubDetailView.spec.js
git commit -m "feat(ui-rework): restyle ClubDetailView + fix unreachable club-feed link"
```

---

## Self-Review

**1. Spec coverage:** §3's list/detail/form restyle patterns are applied to all 7 views. The §5 club-feed nav-link fix is in Task 7. The 3 form-only views (Login/SignUp/Profile) correctly get the lighter `LiCard → LiGlassCard` treatment per §3's "Forms" rule, without an unnecessary `LiPageHeader` (a centered single-card auth/profile layout doesn't need a page-header-plus-card double-heading — this mirrors the Phase-1-era design discussion, not a new decision introduced silently here).

**2. Placeholder scan:** No TBD/TODO; every step has complete code; every new test has real assertions and expected failure/pass output.

**3. Type consistency:** `useViewport()` returns `{ isMobile }` exactly as Phase 1 defined it — Task 6 destructures it correctly. `LiPageHeader`'s `#actions` slot name and `eyebrow`/`title`/`subtitle` props are used identically to how Phase 1 defined them (Tasks 4, 5, 6, 7 all use `title`/`subtitle` correctly; Task 4/6/7 use `#actions` where a header-row button exists, Task 5 (FeedView) omits `#actions` since it has none). `LiListTile`'s `title`/`subtitle` props and `#trailing` slot are used consistently across Tasks 4 and 7.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-14-ui-ux-rework-phase-2-core-social-auth.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
