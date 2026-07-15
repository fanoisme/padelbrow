# UI/UX Rework — Phase 3: Meets & Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the 4 "Meets & Matches" views (`MeetsListView`, `MeetDetailView`, `CreateMeetView`, `MatchSessionView`) using the established `Li*`/`LiPageHeader` pattern, and fix the one navigation dead-end this group contains: `MeetDetailView`'s "Matches" tab has shown a stale "Matches open in Phase 4" placeholder since Phase 4 shipped, even though `MatchSessionView` has worked the whole time.

**Architecture:** Same independent-per-view approach as Phases 1-2. No new shared components. `MeetDetailView`'s tab panels use `v-show` (not `v-if`) today specifically so hidden-tab content stays in the DOM for text-based test assertions — this must be preserved exactly, or `MeetDetailView.spec.js`'s `'Fano'` assertion (which lives in the Participants tab, not the default-active Details tab) will start failing. `MatchSessionView` is the most sensitive file in this phase (live score-entry UI) — its restyle deliberately avoids one specific known pitfall (see Global Constraints).

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, the Lithium design-system (`src/design-system/components/`), plain CSS custom properties.

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-14-ui-ux-consistency-rework-design.md`. This phase implements §3 (per-view-type restyle pattern) and one item from §5 (the `MeetDetailView` Matches-tab nav-link fix).
- **No business-logic changes.** Every composable call (`useMeets`, `useMeetParticipants`, `useMatchSessions`, `useMatchRounds`, `useMatchScoring`, `useAuth`, `useClubs`) keeps identical function names, arguments, and call sites — only `<template>`/`<style>` (and, for `MeetDetailView`, one new `goToMatches()` method using existing router APIs) change.
- **`MeetDetailView`'s tab panels MUST stay `v-show`, never `v-if`.** `MeetDetailView.spec.js`'s only content assertions (`'Fano'`, the participant name) live in the Participants tab (index 1), which is not the default active tab (`activeTab` starts at `0`). `v-show` keeps that markup in the DOM (just `display: none`), so `wrapper.text()` still contains it; `v-if` would remove it from the DOM entirely and silently break the test. This is not a hypothetical — it's exactly how the existing spec already passes today.
- **Do not swap the two raw `<input type="number" v-model.number>` fields in `MatchSessionView`'s score-entry UI or setup form to `LiTextField`.** This codebase has a known, already-documented defect: `LiTextField` doesn't declare `modelModifiers`, so `v-model.number` is silently a no-op on it — numeric values would arrive as strings instead of numbers. Native `<input type="number" v-model.number>` doesn't have this problem. Swapping these specific fields to `LiTextField` would introduce a real regression (broken score/court/set-point numeric values). Leave them as plain HTML inputs; only the two `<select>` dropdowns (`format`, `ranking_criteria` — string enums, no numeric modifier involved) become `LiSelect`.
- **Preserve every existing spec assertion exactly.** `MeetsListView`, `CreateMeetView`, and `MatchSessionView` need **zero** spec file changes — pure restyles that don't touch any asserted text/selector. Only `MeetDetailView` gets one new test (for the genuinely new Matches-tab navigation).
- **Breakpoint convention:** literal `480px`/`768px`/`1024px` only — this phase doesn't need new `@media` rules; `LiPageHeader`'s built-in `flex-wrap` handles header-row wrapping, and the standings table gets a plain `overflow-x: auto` wrapper (no breakpoint needed) to avoid layout breakage on narrow screens.
- **No new npm dependencies, no new design-system components.** Everything needed (`LiPageHeader`, `LiGlassCard`, `LiCard`, `LiListTile`, `LiSelect`, `LiRevealOnScroll`) already exists from Phase 1 or earlier.
- **Dark mode:** only semantic tokens (`--color-on-surface`, `--color-gray-*`, etc.) — no new hardcoded hex colors.

## File Structure

- Modify: `src/views/meets/MeetsListView.vue` (LiPageHeader + LiRevealOnScroll grid)
- Modify: `src/views/meets/MeetDetailView.vue` + `src/views/meets/MeetDetailView.spec.js` (LiPageHeader + LiCard/LiListTile participants + Matches-tab nav-link fix)
- Modify: `src/views/meets/CreateMeetView.vue` (LiCard → LiGlassCard only)
- Modify: `src/views/matches/MatchSessionView.vue` (LiPageHeader + LiCard/LiListTile rounds + LiSelect setup dropdowns + LiGlassCard setup panel + scrollable standings table)

---

### Task 1: MeetsListView — LiPageHeader + LiRevealOnScroll grid

**Files:**
- Modify: `src/views/meets/MeetsListView.vue` (full file)
- Test: `src/views/meets/MeetsListView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiRevealOnScroll` (existing, from Phase 1 / design-system).

**Preserve exactly:** `listMeets` called on mount; `wrapper.text()` contains `'Tue Night'` (meet title, via the existing `RouterLinkStub`) and `'Create meet'` (button text).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/MeetsListView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/meets/MeetsListView.vue` in full**

```vue
<template>
  <section class="meets-list-view">
    <LiPageHeader title="Meets" subtitle="Book a social match or join one nearby.">
      <template #actions>
        <LiButton @click="$router.push('/meets/new')">Create meet</LiButton>
      </template>
    </LiPageHeader>

    <LiEmptyState v-if="meets.length === 0" title="No upcoming meets" icon="event" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="meets-list-view__list">
        <LiCard v-for="meet in meets" :key="meet.id" hover>
          <router-link :to="`/meets/${meet.id}`">
            <h3>{{ meet.title }}</h3>
            <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          </router-link>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, LiPageHeader, LiRevealOnScroll, useToast } from '../../design-system/components/index.js'
import { useMeets } from '../../composables/useMeets.js'

const { listMeets } = useMeets()
const toast = useToast()
const meets = ref([])

onMounted(async () => {
  try {
    meets.value = await listMeets()
  } catch (err) {
    toast.error(err.message || 'Could not load meets.')
  }
})

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meets-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.meets-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/meets/MeetsListView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/meets/MeetsListView.vue
git commit -m "feat(ui-rework): restyle MeetsListView with LiPageHeader"
```

---

### Task 2: MeetDetailView — LiPageHeader + LiCard/LiListTile participants + Matches-tab nav-link fix

**Files:**
- Modify: `src/views/meets/MeetDetailView.vue` (full file)
- Modify: `src/views/meets/MeetDetailView.spec.js` (full file — adds 1 new test to the existing 1)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile` (existing design-system components), `useRouter()` (existing vue-router API, newly used in this file for the nav-fix).

**Preserve exactly:** `getMeet` called with `'m1'`; `wrapper.text()` contains `'Tue Night'`, `'Fano'` (participant, in the Participants tab — **must stay reachable via `v-show`, not `v-if`**), and `'Join'`.

**Nav-fix context (spec §5, item 4):** `MeetDetailView`'s "Matches" tab currently shows `<LiEmptyState title="Matches open in Phase 4" icon="trophy" />` — a stale placeholder that was never wired up, even though `MatchSessionView` (route name `match-session`, path `/meets/:meetId/match-session/:sessionId?`) has worked since Phase 4. This task replaces the placeholder with a real "Open match session" button. `MatchSessionView` already bootstraps a new session when no `sessionId` is given (confirmed: its `onMounted` only calls `getSession` `if (route.params.sessionId)`), so this is template/routing wiring, not new business logic.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Write the new failing test**

Replace `src/views/meets/MeetDetailView.spec.js` in full:

```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'm1', title: 'Tue Night', creator_id: 'u1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

const listParticipants = vi.fn().mockResolvedValue([
  { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
])
const joinMeet = vi.fn().mockResolvedValue({ id: 'p2', status: 'confirmed' })
const leaveMeet = vi.fn().mockResolvedValue()
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants, joinMeet, leaveMeet })),
}))

vi.mock('../../composables/useChat.js', () => ({
  useChat: vi.fn(() => ({ messages: ref([]), send: vi.fn(), subscribe: () => () => {} })),
}))

vi.mock('../../composables/useExpenses.js', () => ({
  useExpenses: vi.fn(() => ({
    addExpense: vi.fn(),
    listExpensesWithShares: vi.fn().mockResolvedValue([]),
    deleteExpense: vi.fn(),
  })),
}))

vi.mock('../../composables/usePayments.js', () => ({
  usePayments: vi.fn(() => ({
    createPayment: vi.fn(),
    listPaymentsForMeet: vi.fn().mockResolvedValue([]),
    confirmPayment: vi.fn(),
    rejectPayment: vi.fn(),
    remindUser: vi.fn(),
  })),
}))

vi.mock('../../composables/useStorage.js', () => ({
  useStorage: vi.fn(() => ({ uploadPaymentProof: vi.fn(), uploadFeedMedia: vi.fn() })),
}))

import MeetDetailView from './MeetDetailView.vue'

describe('MeetDetailView', () => {
  it('loads the meet + participants and shows Join for a non-participant', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:id', name: 'meet-detail', component: MeetDetailView }],
    })
    router.push('/meets/m1')
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getMeet).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })

  it('navigates to the match session when "Open match session" is clicked', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/:id', name: 'meet-detail', component: MeetDetailView },
        { path: '/meets/:meetId/match-session/:sessionId?', name: 'match-session', component: { template: '<div>stub match session</div>' } },
      ],
    })
    router.push('/meets/m1')
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    // The Matches tab panel is v-show (not the active tab by default), so its
    // button is already in the DOM without needing to switch tabs first.
    const matchBtn = wrapper.findAll('button').find((b) => b.text().match(/open match session/i))
    expect(matchBtn).toBeTruthy()
    await matchBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/meets/m1/match-session')
  })
})
```

- [ ] **Step 3: Run the spec to verify the new test fails**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: FAIL on the second test — no button matching `/open match session/i` exists yet.

- [ ] **Step 4: Replace `src/views/meets/MeetDetailView.vue` in full**

```vue
<template>
  <section v-if="meet" class="meet-detail-view">
    <LiPageHeader :title="meet.title">
      <template #actions>
        <LiButton v-if="myParticipation === 'none'" @click="handleJoin">Join</LiButton>
        <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
        <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
      </template>
    </LiPageHeader>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiCard>
          <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
          <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
          <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
        </LiCard>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <LiCard flush>
          <LiListTile v-for="p in participants" :key="p.id" :title="p.profiles.full_name">
            <template #trailing>
              <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
            </template>
          </LiListTile>
        </LiCard>
      </div>

      <!-- Payments -->
      <div v-show="activeTab === 2">
        <ExpensesPanel :meet-id="meet.id" :is-organizer="isOrganizer" />
        <PaymentsPanel :meet-id="meet.id" :is-organizer="isOrganizer" :fee-amount="meet.fee_amount" />
      </div>

      <!-- Matches -->
      <div v-show="activeTab === 3">
        <LiEmptyState title="Ready to play?" description="Start a live match session to generate rounds and track scores." icon="trophy">
          <template #action>
            <LiButton @click="goToMatches">Open match session</LiButton>
          </template>
        </LiEmptyState>
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 4">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import MeetChat from '../../components/meets/MeetChat.vue'
import ExpensesPanel from '../../components/payments/ExpensesPanel.vue'
import PaymentsPanel from '../../components/payments/PaymentsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getMeet } = useMeets()
const { listParticipants, joinMeet, leaveMeet } = useMeetParticipants()
const toast = useToast()

const meet = ref(null)
const participants = ref([])
const activeTab = ref(0)
const tabs = [
  { label: 'Details' },
  { label: 'Participants' },
  { label: 'Payments' },
  { label: 'Matches' },
  { label: 'Chat' },
]

const myParticipation = computed(() => {
  const mine = participants.value.find((p) => p.user_id === user.value?.id)
  if (!mine) return 'none'
  return mine.status
})

const isOrganizer = computed(() => meet.value?.creator_id === user.value?.id)

async function reloadParticipants() {
  participants.value = await listParticipants(route.params.id)
}

onMounted(async () => {
  try {
    meet.value = await getMeet(route.params.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not load this meet.')
  }
})

async function handleJoin() {
  try {
    await joinMeet(meet.value, user.value.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not join the meet.')
  }
}

async function handleLeave() {
  try {
    await leaveMeet(route.params.id, user.value.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not leave the meet.')
  }
}

function statusVariant(status) {
  if (status === 'confirmed') return 'success'
  if (status === 'waitlisted') return 'warning'
  if (status === 'invited') return 'info'
  return 'neutral'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function goToMatches() {
  router.push({ name: 'match-session', params: { meetId: route.params.id } })
}
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 5: Run the spec to verify both tests pass**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/meets/MeetDetailView.vue src/views/meets/MeetDetailView.spec.js
git commit -m "feat(ui-rework): restyle MeetDetailView + fix stale Matches-tab placeholder"
```

---

### Task 3: CreateMeetView — LiCard → LiGlassCard

**Files:**
- Modify: `src/views/meets/CreateMeetView.vue` (full file)
- Test: `src/views/meets/CreateMeetView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiGlassCard` (existing).

**Preserve exactly:** `wrapper.text()` contains `'Create a meet'` and `'Padel Brow'` (club option) on step 1; the wizard's "Next"/"Back"/"Create meet" button-driven flow calls `createMeet` with the wizard payload and `'u1'` as creator id on final submit.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/CreateMeetView.spec.js`
Expected: PASS (2 tests)

- [ ] **Step 2: Replace `src/views/meets/CreateMeetView.vue` in full**

```vue
<template>
  <section class="create-meet-view">
    <h1>Create a meet</h1>
    <ol class="create-meet-view__steps">
      <li v-for="(s, i) in stepLabels" :key="s" :class="{ 'is-active': step === i, 'is-done': step > i }">{{ s }}</li>
    </ol>

    <LiGlassCard class="create-meet-view__card">
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
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiGlassCard, LiButton, LiTextField, LiSelect, LiToggle, useToast } from '../../design-system/components/index.js'
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
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/meets/CreateMeetView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/meets/CreateMeetView.vue
git commit -m "feat(ui-rework): restyle CreateMeetView with LiGlassCard"
```

---

### Task 4: MatchSessionView — LiPageHeader + LiCard/LiListTile rounds + LiSelect setup dropdowns

**Files:**
- Modify: `src/views/matches/MatchSessionView.vue` (full file)
- Test: `src/views/matches/MatchSessionView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile`, `LiSelect`, `LiGlassCard` (existing).

**Preserve exactly:**
- `getSession` called with `'ms1'`; `listRoundsWithMatches` called with `'ms1'`; `wrapper.text()` contains `'Standings'`; `computeStandingsFor` called.
- `[data-testid="generate-round-btn"]` exists, and clicking it calls `generateRound` with `{ playerIds: ['p1','p2','p3','p4'] }`.
- When no `sessionId` is present, `getSession` is NOT called, `[data-testid="create-session-btn"]` exists, and clicking it calls `createSession` with a payload whose `format` is `'americano'` (the setup form's default) and `'meet1'` as the second argument.
- **Do not use `LiTextField` for the "Courts" or "Points per set" number inputs, or for the score-entry inputs** — see Global Constraints (`v-model.number` no-op risk). Keep these as plain `<input type="number" v-model.number="...">`.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: PASS (3 tests)

- [ ] **Step 2: Replace `src/views/matches/MatchSessionView.vue` in full**

```vue
<template>
  <section v-if="session" class="match-session-view">
    <LiPageHeader title="Match session">
      <template #actions>
        <LiBadge :label="session.format" variant="brand" />
        <LiBadge :label="session.status" :variant="statusVariant(session.status)" />
      </template>
    </LiPageHeader>

    <div class="match-session-view__actions">
      <LiButton data-testid="generate-round-btn" @click="handleGenerateRound">Generate next round</LiButton>
    </div>

    <LiCard v-for="round in rounds" :key="round.id" class="match-session-view__round">
      <h3>Round {{ round.round_number + 1 }}</h3>
      <LiListTile
        v-for="m in round.matches"
        :key="m.id"
        :title="`Court ${m.court_number}`"
        :subtitle="`${m.team_a.join(' / ')} vs ${m.team_b.join(' / ')}`"
      >
        <template #trailing>
          <span v-if="m.status === 'completed'" class="match-session-view__score">{{ m.score_a }}-{{ m.score_b }}</span>
          <div v-else class="match-session-view__score-entry">
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
            <LiButton size="sm" @click="handleFinalize(m)">Finalize</LiButton>
          </div>
        </template>
      </LiListTile>
    </LiCard>

    <div class="match-session-view__standings">
      <h2>Standings</h2>
      <div class="match-session-view__standings-scroll">
        <table>
          <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in standings" :key="s.player_id">
              <td>{{ i + 1 }}</td><td>{{ s.player_id }}</td>
              <td>{{ s.played }}</td><td>{{ s.won }}</td><td>{{ s.lost }}</td>
              <td>{{ s.points_for }}</td><td>{{ s.points_against }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section v-else class="match-session-view match-session-view__setup">
    <LiPageHeader title="New match session" />
    <LiGlassCard class="match-session-view__setup-card">
      <LiSelect
        v-model="setup.format"
        label="Format"
        :options="[
          { value: 'americano', label: 'Americano' },
          { value: 'mexicano', label: 'Mexicano' },
          { value: 'team_americano', label: 'Team Americano' },
          { value: 'singles', label: 'Singles' },
        ]"
      />
      <LiSelect
        v-model="setup.ranking_criteria"
        label="Ranking by"
        :options="[
          { value: 'matches_won', label: 'Matches won' },
          { value: 'points_won', label: 'Points won' },
          { value: 'win_pct', label: 'Win %' },
          { value: 'points_pct', label: 'Points %' },
        ]"
      />
      <label class="match-session-view__field">
        Courts
        <input type="number" min="1" v-model.number="setup.num_courts" />
      </label>
      <label class="match-session-view__field">
        Points per set
        <input type="number" min="1" v-model.number="setup.total_set_points" />
      </label>
      <LiButton data-testid="create-session-btn" :loading="creating" @click="handleCreate">Create session</LiButton>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiCard, LiGlassCard, LiListTile, LiSelect, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import { useMatchRounds } from '../../composables/useMatchRounds.js'
import { useMatchScoring } from '../../composables/useMatchScoring.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getSession, createSession, setStatus } = useMatchSessions()
const { generateRound, listRoundsWithMatches } = useMatchRounds()
const { enterScore, finalizeMatch, computeStandingsFor } = useMatchScoring()
const { listParticipants } = useMeetParticipants()

const session = ref(null)
const rounds = ref([])
const participants = ref([])
const scoreCache = reactive({})
const creating = ref(false)
const setup = ref({ format: 'americano', ranking_criteria: 'matches_won', num_courts: 1, total_set_points: 21 })

const playerIds = computed(() => participants.value.map((p) => p.user_id))
const standings = computed(() =>
  session.value ? computeStandingsFor(rounds.value, playerIds.value, session.value.ranking_criteria) : []
)

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

async function reload() {
  rounds.value = await listRoundsWithMatches(session.value.id)
}

onMounted(async () => {
  // No sessionId → show the setup form (session stays null). Only load when a
  // session id is present, so the create flow doesn't 404 on getSession(undefined).
  if (!route.params.sessionId) return
  try {
    session.value = await getSession(route.params.sessionId)
    participants.value = await listParticipants(route.params.meetId)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load the match session.')
  }
})

async function handleCreate() {
  creating.value = true
  try {
    const created = await createSession(setup.value, route.params.meetId)
    router.push({ name: 'match-session', params: { meetId: route.params.meetId, sessionId: created.id } })
  } catch (err) {
    toast.error(err.message || 'Could not create the session.')
  } finally {
    creating.value = false
  }
}

async function handleGenerateRound() {
  try {
    const nextRound = rounds.value.length
    await generateRound(session.value, { playerIds: playerIds.value }, nextRound)
    await reload()
    toast.success('Round generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate the round.')
  }
}

async function handleFinalize(m) {
  const inputs = scoreOf(m)
  const a = inputs.a === '' ? null : Number(inputs.a)
  const b = inputs.b === '' ? null : Number(inputs.b)
  if (a == null || b == null) {
    toast.error('Enter both scores first.')
    return
  }
  try {
    await enterScore(m.id, a, b)
    await finalizeMatch(m.id)
    await reload()
    toast.success('Match finalized.')
  } catch (err) {
    toast.error(err.message || 'Could not finalize the match.')
  }
}

function statusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  return 'neutral'
}
</script>

<style scoped>
.match-session-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.match-session-view__actions { display: flex; }
.match-session-view__round { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.match-session-view__score-entry { display: flex; align-items: center; gap: var(--space-xs, 4px); }
.match-session-view__score-input { width: 56px; padding: var(--space-xs, 4px); border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px); }
.match-session-view__standings-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.match-session-view__standings table { width: 100%; border-collapse: collapse; }
.match-session-view__standings th, .match-session-view__standings td { padding: var(--space-s, 8px); text-align: left; border-bottom: 1px solid var(--color-gray-200, #E6E6E6); }
.match-session-view__setup-card { display: flex; flex-direction: column; gap: var(--space-m, 16px); max-width: 480px; margin: 0 auto; }
.match-session-view__field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); font-size: var(--text-xs, 14px); font-weight: 500; color: var(--color-gray-800, #4D4D4D); }
.match-session-view__field input { padding: 12px 16px; border: 1.5px solid var(--color-gray-300, #CCCCCC); border-radius: var(--radius-sm, 4px); font-size: var(--text-sm, 16px); }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: PASS (3 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/matches/MatchSessionView.vue
git commit -m "feat(ui-rework): restyle MatchSessionView with LiPageHeader + LiListTile rounds"
```

---

## Self-Review

**1. Spec coverage:** §3's list/detail/form restyle patterns applied across all 4 views. The §5 Matches-tab nav-link fix is in Task 2. The `v-model.number`-on-`LiTextField` pitfall (a real, previously-documented codebase defect) is explicitly called out and avoided in Task 4, rather than silently introduced.

**2. Placeholder scan:** No TBD/TODO; every step has complete code; the new `MeetDetailView` test has real assertions and expected failure/pass output.

**3. Type consistency:** `LiPageHeader`'s `title`/`subtitle`/`#actions` and `LiListTile`'s `title`/`#trailing` are used identically to how Phases 1-2 established them. `goToMatches()` in Task 2 pushes `{ name: 'match-session', params: { meetId: route.params.id } }` — matching the exact route name and param (`meetId`) that `router/index.js` and `MatchSessionView`'s own `route.params.meetId` usage (Task 4) both expect; `MeetDetailView`'s own route param is named `id` (from `/meets/:id`), which is correctly mapped into the target route's `meetId` param rather than assumed to be the same name.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-14-ui-ux-rework-phase-3-meets-matches.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
