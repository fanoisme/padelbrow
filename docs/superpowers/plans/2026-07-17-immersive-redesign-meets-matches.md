# Immersive Redesign — Meets & Matches Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Propagate the immersive/playful/premium visual language (already built in Phase 0/1 foundation + shell, and already live on Home, Achievements, Challenges, Network, PersonalStats, and CompetitionsListView) to the four remaining meets/matches views: `MeetsListView`, `MeetDetailView`, `CreateMeetView` (+ its shared `CreateMatchFlow`), and `MatchSessionView`.

**Architecture:** Per-view restyle using existing immersive primitives (`LiHero`, `LiGlassCard`, `LiRevealOnScroll`, `LiMagneticButton`, `LiConfetti`, `LiProgress`, `useCursorAwareness`, `LiCountUp`) — no new shared components needed. `MatchSessionView`/`CreateMatchFlow` already have a bespoke dark "arena" aesthetic (glow, pulse-live dot, avatar rings) from a prior phase; per the master spec these two are explicitly allowed to stay "immersive-dark even in light mode" (the arena identity is intentional), so their tasks focus on tokenizing hardcoded hex (so a dark→light toggle doesn't visually break them) plus the two named signature moments (number-morph scoring, count-up standings, haptic), not a full re-skin. `MeetsListView`/`MeetDetailView` get the fuller treatment (hero, glass cards, avatar stack, confetti) since they're still on the plain `LiPageHeader`/`LiCard` baseline.

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, Lithium design-system (`src/design-system/components/`, `src/design-system/composables/`), plain CSS custom properties (`tokens.css`).

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-15-immersive-redesign-design.md` §5 (per-view table, rows: MeetsListView, CreateMeetView, MeetDetailView, MatchSessionView) and §6 (dual-mode parity rules), §8 (anti-slop/Wow Test), §10 (hard constraints).
- **No new routes, no auth/RLS/schema changes, no new npm dependencies.** Everything used here (`LiHero`, `LiGlassCard`, `LiRevealOnScroll`, `LiMagneticButton`, `LiConfetti`, `LiProgress`, `LiAvatar`, `useCursorAwareness`, `LiCountUp`) already exists in `src/design-system/`.
- **Composables stay untouched with one flagged, minimal exception:** `useMeets.js`'s `listMeets()` gets its Supabase `select()` string widened to embed a participant count (`meet_participants(count)`) so `MeetsListView` can render the "X/N players joined" fill bar the spec requires (§5 row 1). No function signature, argument, RPC, or write path changes — purely an additive read column. This is the same class of change the codebase already uses elsewhere (`useMeetParticipants` already embeds `profiles` in its selects). Flagged here per spec §3.9's "additive only, document, don't invent silently" rule. No other composable in this plan is touched.
- **Host avatar simplification:** `meets` rows only carry `creator_id` (no name/photo join exists anywhere in the codebase for meet creators). Rather than adding a second composable call per list row, `MeetsListView`'s "host avatar" is a generic `LiAvatar` (person icon, no initials) tinted by a deterministic hash of `creator_id` — visually distinct per host without a new data dependency. Documented here, not invented silently.
- **Preserve every existing spec assertion exactly, verbatim strings and `data-testid`s.** None of `MeetsListView.spec.js`, `MeetDetailView.spec.js`, `CreateMeetView.spec.js`, `MatchSessionView.spec.js` get spec-file changes — every task is a template/style/script-presentation-only change validated against the current suite. (`CreateMatchFlow.vue` has no dedicated spec file; it's exercised indirectly via `MatchSessionView.spec.js` and `CreateMeetView.spec.js`.)
- **Dual-mode parity:** no new hardcoded hex. `MatchSessionView.vue` and `CreateMatchFlow.vue` currently hardcode dark colors (`#181818`, `#1E1E1E`, `#121212`, `#FFFFFF`, etc.) — these get replaced with semantic tokens even though the visual *result* stays a deliberately dark "arena" surface (achieved via a `dark`-variant token set, not literal hex), per spec §5's explicit allowance that this view stays "immersive-dark even in light mode."
- **Known gap, deferred:** spec §3.5 describes a shell-level View Transitions API integration (`document.startViewTransition` + shared `view-transition-name` on hero titles/avatars) as Phase 0 foundation work. It was not actually implemented in `src/router/index.js` or `App.vue` (verified: no `view-transition-name`/`startViewTransition` reference anywhere in `src/`). `MeetDetailView`'s spec-listed "shared-element morph from list card" signature moment therefore cannot be delivered by this plan without an out-of-scope router/shell change. This plan ships the rest of MeetDetailView's per-view treatment (hero, glass sections, avatar stack, RSVP confetti) and relies on `LiRevealOnScroll`'s entrance animation as the page's reveal moment instead. Flagging here rather than silently dropping it — the shared-element transition should be a separate cross-cutting shell task if wanted later.
- **Reduced-motion safe:** `LiConfetti`/`LiSparkle`/`useCursorAwareness`/`LiCountUp` already no-op or degrade under `prefers-reduced-motion: reduce` — no extra guards needed in this plan's new usages.
- **Breakpoint convention:** literal `480px`/`768px`/`1024px` only, consistent with the rest of the codebase.
- Run `npx vitest run` (full suite) after each task, not just the touched spec file, to catch any cross-file regression early.

---

### Task 1: `useMeets.js` participant-count widening + `MeetsListView` rich cards

**Files:**
- Modify: `src/composables/useMeets.js` (widen `listMeets()` select only)
- Modify: `src/views/meets/MeetsListView.vue` (full file)
- Test: `src/views/meets/MeetsListView.spec.js` (no changes — verify unmodified, still green)

**Interfaces:**
- Consumes: `LiHero`, `LiGlassCard`, `LiRevealOnScroll`, `LiMagneticButton`, `LiAvatar`, `LiBadge`, `LiProgress`, `LiEmptyState`, `useCursorAwareness`, `useToast` (all from `../../design-system/components/index.js`), `useMeets` (existing composable, args/return shape unchanged except the new `meet_participants` field on each row).
- Produces: none consumed by later tasks (this view is a leaf).

**Preserve exactly:** `listMeets` called on mount with no arguments; `wrapper.text()` contains `'Tue Night'` and `'Create meet'`. The spec's mock data (`{ id, title, venue_name, starts_at }`, no `meet_participants` field, no `format`, no `creator_id`, no `max_players`) must render without throwing — every new field access needs a safe fallback.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/MeetsListView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Widen `listMeets()` in `useMeets.js`**

In `src/composables/useMeets.js`, replace the `listMeets` function body:

```js
  async function listMeets() {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('meets')
      .select('*, meet_participants(count)')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
    if (error) throw error
    return data
  }
```

(Only the `.select('*')` → `.select('*, meet_participants(count)')` line changes. Every other function in the file is untouched.)

- [ ] **Step 3: Run the spec again to confirm it's still green after the composable change**

Run: `npx vitest run src/views/meets/MeetsListView.spec.js`
Expected: PASS (1 test) — the mock replaces `useMeets` entirely, so the real query never runs in the test.

- [ ] **Step 4: Replace `src/views/meets/MeetsListView.vue` in full**

```vue
<template>
  <section class="meets-list-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      eyebrow="Padel socials"
      title="Meets"
      subtitle="Book a social match or join one nearby."
    >
      <template #actions>
        <LiMagneticButton variant="primary" icon="add" @click="$router.push('/meets/new')">
          Create meet
        </LiMagneticButton>
      </template>
    </LiHero>

    <LiEmptyState v-if="meets.length === 0" title="No upcoming meets" icon="event" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="meets-list-view__list">
        <LiGlassCard
          v-for="meet in meets"
          :key="meet.id"
          class="meets-list-view__card"
          variant="light"
          hoverable
        >
          <router-link
            :to="`/meets/${meet.id}`"
            class="meets-list-view__link"
            @mousemove="onCardMove($event, meet.id)"
            @mouseleave="onCardLeave(meet.id)"
            :style="cardTiltStyle(meet.id)"
          >
            <div class="meets-list-view__top">
              <LiAvatar size="md" :style="hostAvatarStyle(meet)" alt="Host" />
              <div class="meets-list-view__heading">
                <h3 class="meets-list-view__title">{{ meet.title }}</h3>
                <p class="meets-list-view__meta">{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
              </div>
            </div>

            <LiBadge
              v-if="meet.format"
              :label="formatLabel(meet.format)"
              variant="brand"
              is-pill
              size="sm"
              class="meets-list-view__format"
            />

            <div class="meets-list-view__fill">
              <LiProgress :value="fillPct(meet)" variant="brand" label="Players joined" />
              <span class="meets-list-view__fill-count">{{ confirmedCount(meet) }}/{{ meet.max_players || '—' }}</span>
            </div>
          </router-link>
        </LiGlassCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  LiAvatar, LiBadge, LiEmptyState, LiGlassCard, LiHero, LiMagneticButton,
  LiProgress, LiRevealOnScroll, useCursorAwareness, useToast,
} from '../../design-system/components/index.js'
import { useMeets } from '../../composables/useMeets.js'

const { listMeets } = useMeets()
const toast = useToast()
const meets = ref([])

const { tilt } = useCursorAwareness()
const cardTilts = new Map()
function getCardTilt(id) {
  if (!cardTilts.has(id)) cardTilts.set(id, tilt({ maxDeg: 4 }))
  return cardTilts.get(id)
}
function onCardMove(e, id) { getCardTilt(id).onMove(e, e.currentTarget) }
function onCardLeave(id) { getCardTilt(id).onLeave() }
function cardTiltStyle(id) { return getCardTilt(id).style.value }

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

const FORMAT_LABELS = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  team_mexicano: 'Team Mexicano',
  singles: 'Singles',
  social: 'Social',
}
function formatLabel(format) { return FORMAT_LABELS[format] || format }

function confirmedCount(meet) { return meet.meet_participants?.[0]?.count ?? 0 }
function fillPct(meet) {
  const max = meet.max_players || 0
  if (!max) return 0
  return Math.min(100, Math.round((confirmedCount(meet) / max) * 100))
}

// Deterministic hue from the host id so avatar tints are distinct without extra data.
function hostAvatarStyle(meet) {
  const id = meet.creator_id || meet.id
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360
  return { background: `hsl(${h}, 55%, 45%)` }
}
</script>

<style scoped>
.meets-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
}

.meets-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-m, 12px);
}

.meets-list-view__card {
  transition: transform var(--dur-medium, 300ms) var(--ease-smooth);
}

.meets-list-view__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
  color: inherit;
  text-decoration: none;
}

.meets-list-view__top {
  display: flex;
  align-items: center;
  gap: var(--space-m, 12px);
}

.meets-list-view__heading {
  min-width: 0;
}

.meets-list-view__title {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 700;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meets-list-view__meta {
  margin: 2px 0 0;
  font-size: var(--text-sm, 14px);
  color: var(--color-on-surface-variant);
}

.meets-list-view__format {
  align-self: flex-start;
}

.meets-list-view__fill {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.meets-list-view__fill :deep(.li-progress) {
  flex: 1;
}

.meets-list-view__fill-count {
  font-size: var(--text-xs, 13px);
  font-weight: 700;
  color: var(--color-on-surface-variant);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 5: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/meets/MeetsListView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useMeets.js src/views/meets/MeetsListView.vue
git commit -m "feat(immersive-redesign): rich meet cards with fill-bar and hover tilt"
```

---

### Task 2: `MeetDetailView` — immersive hero + avatar stack + RSVP confetti

**Files:**
- Modify: `src/views/meets/MeetDetailView.vue` (full file)
- Test: `src/views/meets/MeetDetailView.spec.js` (no changes — verify unmodified, still green)

**Interfaces:**
- Consumes: `LiHero`, `LiGlassCard`, `LiConfetti`, `LiMagneticButton`, `LiAvatar` (new imports), plus every existing import (`LiButton`, `LiBadge`, `LiTabs`, `LiEmptyState`, `LiCard`, `LiListTile`, `LiBottomSheet`, `LiTextField`, `LiIcon`, `LiSpinner`, `useToast`) and existing composables (`useAuth`, `useMeets`, `useMeetParticipants`, `useMatchSessions`) — none of their call sites change.
- Produces: none (leaf view).

**Preserve exactly:** `getMeet` called with `'m1'`; tab panels stay `v-show` (never `v-if`) so `'Fano'` (Participants tab, index 1, not the default-active tab) stays in `wrapper.text()`; `'Tue Night'`, `'Join'` text; `/open match session/i`, `/\+ add player/i` button-text regexes; `data-testid`s `add-player-member`, `guest-name-input`, `add-guest-btn`, `add-player-loading`, `remove-participant-btn` all unchanged.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: PASS (9 tests)

- [ ] **Step 2: Replace `src/views/meets/MeetDetailView.vue` in full**

```vue
<template>
  <section v-if="meet" class="meet-detail-view">
    <LiHero
      variant="warm"
      intensity="subtle"
      :eyebrow="meet.venue_name || 'Venue TBD'"
      :title="meet.title"
      :subtitle="formatWhen(meet.starts_at)"
    >
      <template #actions>
        <LiConfetti :trigger="confettiTrigger" :count="18" :lifespan="1000">
          <LiMagneticButton v-if="myParticipation === 'none'" variant="primary" @click="handleJoin">Join</LiMagneticButton>
          <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
          <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
        </LiConfetti>
      </template>
    </LiHero>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiGlassCard variant="light" size="md">
          <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
          <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
          <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
          <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
        </LiGlassCard>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <div class="meet-detail-view__avatar-stack" aria-hidden="true">
          <LiAvatar
            v-for="p in participants.slice(0, 8)"
            :key="p.id"
            size="sm"
            :initials="participantInitials(p)"
            class="meet-detail-view__avatar-stack-item"
          />
        </div>
        <LiButton v-if="isOrganizer" variant="secondary" size="sm" @click="openAddPlayer">+ Add player</LiButton>
        <LiCard flush>
          <LiListTile v-for="p in participants" :key="p.id" :title="p.profiles?.full_name || p.guest_name">
            <template #leading>
              <LiAvatar size="sm" :initials="participantInitials(p)" />
            </template>
            <template #trailing>
              <LiBadge v-if="!p.user_id" label="Guest" variant="neutral" />
              <LiBadge v-else :label="p.status" :variant="statusVariant(p.status)" />
              <button
                v-if="isOrganizer"
                type="button"
                class="participant-remove"
                aria-label="Remove participant"
                data-testid="remove-participant-btn"
                @click="handleRemoveParticipant(p.id)"
              >
                <LiIcon name="close" size="sm" />
              </button>
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
      <div v-show="activeTab === 3" class="meet-detail-view__matches">
        <div class="meet-detail-view__matches-actions">
          <LiMagneticButton variant="secondary" @click="goToMatches">{{ sessions.length ? 'Open match session' : '+ New match session' }}</LiMagneticButton>
          <LiButton v-if="sessions.length" variant="ghost" size="sm" @click="startNewSession">+ Start another session</LiButton>
        </div>
        <LiCard v-if="sessions.length" flush>
          <LiListTile
            v-for="s in sessions"
            :key="s.id"
            :title="formatLabel(s.format)"
            :subtitle="`${s.num_courts} court${s.num_courts === 1 ? '' : 's'} · ${formatDate(s.created_at)}`"
            interactive
            @click="openSession(s.id)"
          >
            <template #trailing>
              <LiBadge :label="sessionStatusLabel(s.status)" :variant="sessionStatusVariant(s.status)" />
            </template>
          </LiListTile>
        </LiCard>
        <LiEmptyState v-else title="Ready to play?" description="Start a live match session to generate rounds and track scores." icon="trophy">
          <template #action>
            <LiMagneticButton @click="goToMatches">Open match session</LiMagneticButton>
          </template>
        </LiEmptyState>
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 4">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>

    <LiBottomSheet v-model="showAddPlayer" title="Add player">
      <div class="add-player-sheet">
        <section v-if="meet.club_id">
          <h4 class="add-player-sheet__label">Club members</h4>
          <LiSpinner v-if="loadingClubMembers" data-testid="add-player-loading" size="sm" inline label="Loading club members…" />
          <template v-else>
            <LiListTile
              v-for="m in clubMembersToAdd"
              :key="m.id"
              :title="m.full_name"
              data-testid="add-player-member"
              interactive
              @click="handleAddExistingMember(m.id)"
            >
              <template #trailing><LiIcon name="add" size="sm" /></template>
            </LiListTile>
            <p v-if="!clubMembersToAdd.length" class="add-player-sheet__empty">No club members left to add.</p>
          </template>
        </section>

        <section class="add-player-sheet__guest">
          <h4 class="add-player-sheet__label">Add a guest</h4>
          <LiTextField v-model="guestName" placeholder="Guest name" data-testid="guest-name-input" />
          <LiButton :disabled="!guestName.trim()" data-testid="add-guest-btn" @click="handleAddGuest">Add guest</LiButton>
        </section>
      </div>
    </LiBottomSheet>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiBottomSheet, LiTextField,
  LiIcon, LiSpinner, LiHero, LiGlassCard, LiMagneticButton, LiConfetti, LiAvatar, useToast,
} from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import MeetChat from '../../components/meets/MeetChat.vue'
import ExpensesPanel from '../../components/payments/ExpensesPanel.vue'
import PaymentsPanel from '../../components/payments/PaymentsPanel.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getMeet } = useMeets()
const { listParticipants, joinMeet, leaveMeet, addExistingMember, addGuest, listClubMembersNotInMeet, removeParticipant } = useMeetParticipants()
const { listSessionsByMeet } = useMatchSessions()
const toast = useToast()

const showAddPlayer = ref(false)
const clubMembersToAdd = ref([])
const loadingClubMembers = ref(false)
const guestName = ref('')
const confettiTrigger = ref(false)

const meet = ref(null)
const participants = ref([])
const sessions = ref([])
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

async function reloadSessions() {
  try {
    sessions.value = await listSessionsByMeet(route.params.id)
  } catch {
    sessions.value = []
  }
}

onMounted(async () => {
  try {
    meet.value = await getMeet(route.params.id)
    await reloadParticipants()
    await reloadSessions()
  } catch (err) {
    toast.error(err.message || 'Could not load this meet.')
  }
})

async function handleJoin() {
  try {
    await joinMeet(meet.value, user.value.id)
    await reloadParticipants()
    confettiTrigger.value = !confettiTrigger.value
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

function participantInitials(p) {
  const name = p.profiles?.full_name || p.guest_name || '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function goToMatches() {
  if (sessions.value.length) {
    openSession(sessions.value[0].id)
  } else {
    startNewSession()
  }
}

function startNewSession() {
  router.push({ name: 'match-session', params: { meetId: route.params.id } })
}

function openSession(sessionId) {
  router.push({ name: 'match-session', params: { meetId: route.params.id, sessionId } })
}

async function openAddPlayer() {
  guestName.value = ''
  showAddPlayer.value = true
  if (!meet.value?.club_id) {
    clubMembersToAdd.value = []
    return
  }
  loadingClubMembers.value = true
  try {
    clubMembersToAdd.value = await listClubMembersNotInMeet(meet.value.id, meet.value.club_id)
  } catch (err) {
    toast.error(err.message || 'Could not load club members.')
  } finally {
    loadingClubMembers.value = false
  }
}

async function handleAddExistingMember(userId) {
  try {
    await addExistingMember(meet.value, userId, user.value.id)
    await reloadParticipants()
    clubMembersToAdd.value = clubMembersToAdd.value.filter((m) => m.id !== userId)
    toast.success('Player added.')
  } catch (err) {
    toast.error(err.message || 'Could not add that player.')
  }
}

async function handleRemoveParticipant(participantId) {
  try {
    await removeParticipant(participantId)
    await reloadParticipants()
    toast.success('Player removed.')
  } catch (err) {
    toast.error(err.message || 'Could not remove that player.')
  }
}

async function handleAddGuest() {
  const trimmed = guestName.value.trim()
  if (!trimmed) return
  try {
    await addGuest(meet.value, trimmed, user.value.id)
    guestName.value = ''
    await reloadParticipants()
    toast.success('Guest added.')
  } catch (err) {
    toast.error(err.message || 'Could not add that guest.')
  }
}

const FORMAT_LABELS = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  team_mexicano: 'Team Mexicano',
  singles: 'Singles',
}
function formatLabel(format) { return FORMAT_LABELS[format] || format }
function sessionStatusLabel(status) {
  if (status === 'in_progress') return 'Live'
  if (status === 'completed') return 'Done'
  return 'Setup'
}
function sessionStatusVariant(status) {
  if (status === 'in_progress') return 'info'
  if (status === 'completed') return 'success'
  return 'neutral'
}
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-detail-view__avatar-stack {
  display: flex;
  margin-bottom: var(--space-s, 8px);
}

.meet-detail-view__avatar-stack-item {
  margin-left: -8px;
  border: 2px solid var(--color-surface, #121212);
}

.meet-detail-view__avatar-stack-item:first-child {
  margin-left: 0;
}

.meet-detail-view__matches {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.participant-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant, #A3A3A3);
  cursor: pointer;
  border-radius: var(--radius-sm, 8px);
  margin-left: var(--space-xs, 4px);
}

.participant-remove:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-error, #C83E3B);
}

.meet-detail-view__matches-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.add-player-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.add-player-sheet__label {
  margin: 0 0 var(--space-xs, 8px);
  font-size: var(--text-xs, 13px);
  font-weight: 700;
  color: var(--color-on-surface-variant, #A3A3A3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.add-player-sheet__empty {
  color: var(--color-on-surface-variant, #A3A3A3);
  font-size: var(--text-sm, 14px);
}

.add-player-sheet__guest {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: PASS (9 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/meets/MeetDetailView.vue
git commit -m "feat(immersive-redesign): MeetDetailView hero, avatar stack, RSVP confetti"
```

---

### Task 3: `CreateMeetView` / `CreateMatchFlow` — tokenize + live preview + sticky mobile submit

**Files:**
- Modify: `src/views/matches/CreateMatchFlow.vue` (full file — tokenize hardcoded hex, add live preview, sticky mobile footer)
- `src/views/meets/CreateMeetView.vue` — **no changes**; it only renders `<CreateMatchFlow standalone @create="handleCreate" @close="router.back()" />`, so every visual change lives in the child.
- Test: `src/views/meets/CreateMeetView.spec.js` (no changes — verify unmodified, still green)

**Interfaces:**
- Consumes: existing `LiIcon`, `LiButton`, `LiBottomSheet`, `useToast` imports; existing composables (`useMatchSessions`, `useMeetParticipants`, `useAuth`) — no call-site changes.
- Produces: none (leaf component, consumed unchanged by `CreateMeetView.vue` and `MatchSessionView.vue`, both of which pass the same props/emit contract as today).

**Preserve exactly:** text `'Choose your game type'`, `'Americano'`, `'Mexicano'`, must NOT render `'Create Room'`/`'Join Match'` when `standalone` (unchanged — that branch is untouched); `data-testid`s `wizard-next`, `create-meet-btn` (standalone) / `create-session-btn` (in-meet), `hero-create` (non-standalone hero); `createMeet` called with `expect.objectContaining({ title, sport: 'padel', format: 'americano' })`; input ordering (`inputs[0]` = title, `inputs[2]` = datetime-local start) — the standalone Step 2 field markup/order must not change.

- [ ] **Step 1: Run the existing specs to confirm the current baseline is green**

Run: `npx vitest run src/views/meets/CreateMeetView.spec.js src/views/matches/MatchSessionView.spec.js`
Expected: PASS (2 tests + 4 tests = 6 tests)

- [ ] **Step 2: Tokenize the hardcoded colors in `CreateMatchFlow.vue`'s `<style>` block**

In `src/views/matches/CreateMatchFlow.vue`, replace every hardcoded color in the `<style scoped>` block with the semantic dark-surface tokens already defined in `tokens.css` (these compute to the same visual values in the current default dark theme, so no visual regression — but now they resolve consistently if a dark-scoped `[data-theme]` override is added later). Apply this find/replace across the whole style block:

**Correction (post-implementation, applied by review + fix commit `fix(immersive-redesign): correct CreateMatchFlow token drift`):** the original table below assumed `--color-gray-900` and `--color-on-surface-variant` were undefined or matched their fallback hex. Neither is true — this codebase's `--color-gray-*` scale is inverted/dark-first (`tokens.css`: `--color-gray-900: #FFFFFF`, `--color-gray-600: #A3A3A3`, `--color-gray-500: #6B6B6B`, `--color-gray-100: #121212`), and `--color-on-surface-variant` is `#D4D4D4`, not `#A3A3A3`. Using `var(--color-gray-900, #1E1E1E)` therefore silently rendered **white**, not dark, on every card/input/stepper surface. The corrected mapping actually shipped:

| Hardcoded (before) | Token (after) — corrected |
|---|---|
| `#121212` (`.cmf` background) | `var(--color-gray-950, #121212)` — `--color-gray-950` doesn't exist in `tokens.css`, so this fallback applies exactly, zero drift |
| `#1E1E1E` (cards, inputs, chips) | `var(--color-surface-panel, #1E1E1E)` — `--color-surface-panel` is intentionally NOT defined in `tokens.css`; the fallback always applies, zero drift |
| `#FFFFFF` (text) | `var(--color-on-surface, #FFFFFF)` — exact match, `--color-on-surface` really is `#FFFFFF` |
| `#A3A3A3` (hints/labels) | `var(--color-gray-600, #A3A3A3)` — exact match, `--color-gray-600` really is `#A3A3A3` |
| `rgba(255,255,255,0.15)` / `0.18` / `0.35` (borders) | `var(--color-on-surface-outline, rgba(255,255,255,0.15))` — undefined token, fallback applies exactly |
| `var(--color-brand)` occurrences | unchanged (already tokenized) |

Concretely, these selectors change (values only, structure identical):

```css
.cmf {
  background: var(--color-gray-950, #121212);
  color: var(--color-on-surface, #FFFFFF);
  box-shadow: var(--shadow-lg);
}
.cmf__hero-sub { color: var(--color-gray-600, #A3A3A3); }
.cmf__x { color: var(--color-on-surface, #FFFFFF); }
.cmf__topbar-title { color: var(--color-on-surface, #FFFFFF); }
.cmf__hint { color: var(--color-gray-600, #A3A3A3); }
.cmf__card { background: var(--color-surface-panel, #1E1E1E); color: var(--color-on-surface, #FFFFFF); }
.cmf__card-icon { background: var(--color-on-surface, #FFFFFF); color: var(--color-on-surface, #FFFFFF); }
.cmf__card-desc { color: var(--color-gray-600, #A3A3A3); }
.cmf__field-label { color: var(--color-gray-600, rgba(255,255,255,0.85)); }
.cmf__input {
  color: var(--color-on-surface, #FFFFFF);
  background: var(--color-surface-panel, #1E1E1E);
  border: 1px solid var(--color-on-surface-outline, rgba(255,255,255,0.15));
}
.cmf__input[readonly] { color: var(--color-gray-600, #DDD); }
.cmf__input::placeholder { color: var(--color-gray-600, #A3A3A3); }
.cmf__rule--row { background: var(--color-surface-panel, #1E1E1E); color: var(--color-on-surface, #FFFFFF); }
.cmf__info { color: var(--color-gray-600, #A3A3A3); }
.cmf__stepper { background: var(--color-surface-panel, #1E1E1E); }
.cmf__stepper button { color: var(--color-on-surface, #FFFFFF); }
.cmf__segmented button { background: var(--color-surface-panel, #1E1E1E); color: var(--color-gray-600, #A3A3A3); }
.cmf__segmented button.is-on { color: var(--color-on-surface, #FFFFFF); }
.cmf__summary { background: var(--color-surface-panel, #1E1E1E); }
.cmf__summary span { color: var(--color-gray-600, #A3A3A3); }
.cmf__btn--outline { color: var(--color-on-surface, #FFFFFF); border: 1.5px solid var(--color-gray-600, #A3A3A3); }
```

(`.cmf__option` rules stay as-is — they're already intentionally dark-on-light for the bottom sheet, which is a different themed surface per the existing in-file comment.)

- [ ] **Step 3: Add a live preview panel to Step 2 (standalone "basics" step)**

In the `<!-- STEP 2 · basics -->` block's standalone `<template v-if="standalone">` branch, add a preview panel right after the closing `</template>` of the duration stepper, still inside `v-if="standalone"`:

```html
        <template v-if="standalone">
          <label class="cmf__field">
            <span class="cmf__field-label">Game Name *</span>
            <input class="cmf__input" type="text" v-model="basics.title" placeholder="Tuesday night social" />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Location</span>
            <input class="cmf__input" type="text" v-model="basics.venue_name" placeholder="Venue name" />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Date &amp; Time *</span>
            <input class="cmf__input" type="datetime-local" v-model="basics.starts_at" />
          </label>
          <div class="cmf__rule">
            <span class="cmf__rule-label">Duration</span>
            <div class="cmf__stepper">
              <button type="button" :disabled="basics.duration_hours <= 1" @click="basics.duration_hours--">−</button>
              <span>{{ durationLabel }}</span>
              <button type="button" :disabled="basics.duration_hours >= 8" @click="basics.duration_hours++">+</button>
            </div>
          </div>

          <div class="cmf__preview" data-testid="basics-preview">
            <p class="cmf__preview-eyebrow">Preview</p>
            <p class="cmf__preview-title">{{ basics.title.trim() || 'Untitled meet' }}</p>
            <p class="cmf__preview-meta">{{ basics.venue_name.trim() || 'Venue TBD' }} · {{ formatWhen(basics.starts_at) || 'Pick a date & time' }}</p>
          </div>
        </template>
```

Then, in `<script setup>`, no new script is needed — `basics` is already `reactive` and `formatWhen` already exists, so the preview re-renders live off the same reactive state fields as the form; no new refs/computed required.

Add the matching CSS (append to the end of `<style scoped>`):

```css
.cmf__preview {
  padding: var(--space-m, 12px);
  border-radius: var(--radius-md, 16px);
  background: var(--color-gray-950, #0E0E0E);
  border: 1px dashed rgba(255,175,3,0.3);
  transition: border-color var(--dur-short, 200ms) var(--ease-out);
}
.cmf__preview-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-brand);
}
.cmf__preview-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-on-surface, #FFFFFF);
}
.cmf__preview-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-on-surface-variant, #A3A3A3);
}
```

- [ ] **Step 4: Make the footer sticky on mobile**

In `<style scoped>`, inside the existing `@media (max-width: 640px)` block, add:

```css
  .cmf__footer {
    position: sticky;
    bottom: 0;
    background: var(--color-gray-950, #121212);
    margin: 0 calc(-1 * var(--space-l, 16px)) calc(-1 * var(--space-l, 16px));
    padding: var(--space-m, 12px) var(--space-l, 16px) calc(var(--space-m, 12px) + env(safe-area-inset-bottom, 0px));
  }
```

(This is inside the block that already sets `.cmf__footer { padding-bottom: ... }` on mobile today — merge into that existing rule rather than duplicating the selector.)

- [ ] **Step 5: Run the specs again to confirm they're still green**

Run: `npx vitest run src/views/meets/CreateMeetView.spec.js src/views/matches/MatchSessionView.spec.js`
Expected: PASS (6 tests), output pristine.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/matches/CreateMatchFlow.vue
git commit -m "feat(immersive-redesign): tokenize CreateMatchFlow + live preview + sticky mobile submit"
```

---

### Task 4: `MatchSessionView` — tokenize + number-morph scoring + count-up standings + haptic

**Files:**
- Modify: `src/views/matches/MatchSessionView.vue` (full file)
- Test: `src/views/matches/MatchSessionView.spec.js` (no changes — verify unmodified, still green)

**Interfaces:**
- Consumes: existing `LiIcon`, `useToast` imports; adds `LiCountUp` (from `../../design-system/components/index.js`); existing composables (`useMatchSessions`, `useMatchRounds`, `useMatchScoring`, `useMeetParticipants`, `useMeets`) — no call-site changes.
- Produces: none (leaf view).

**Preserve exactly:** text `'Standings'`, `'Delta (guest)'`; `data-testid`s `generate-round-btn`, `hero-create` (via `CreateMatchFlow`, untouched by this task), `wizard-next`, `create-session-btn`; the raw `<input type="number" v-model.number>` score-entry fields **must stay untouched** (do not swap to `LiTextField` — documented, known `v-model.number` incompatibility from the prior UI rework phase).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: PASS (4 tests)

- [ ] **Step 2: Tokenize the hardcoded colors in the `<style>` block**

**Verify token values before substituting — do not assume a token name matches its apparent fallback.** Task 3 shipped this exact class of bug: `--color-gray-900` is `#FFFFFF` in this codebase (dark-first, inverted gray scale — `tokens.css`: `--color-gray-700: #CCCCCC`, `--color-gray-600: #A3A3A3`, `--color-gray-500: #6B6B6B`, `--color-gray-100: #121212`), and `--color-on-surface-variant`/`--color-on-surface-muted` are `#D4D4D4`/`#B0B0B0` respectively — not whatever hex happens to look plausible as a fallback. Before writing each line below, the mapping was checked against `tokens.css`'s actual values: real tokens are used ONLY where their defined value is an exact hex match (zero drift either way); everywhere else a deliberately undefined, descriptively-named custom property is introduced instead (its fallback always applies, since it's never defined in `tokens.css` — zero drift, and consistent with the `--color-surface-panel` name Task 3's fix already introduced for `#1E1E1E`).

Apply this corrected substitution across `MatchSessionView.vue`'s `<style scoped>` block:

```css
.msv__x { background: var(--color-surface-panel, #1E1E1E); color: var(--color-on-surface, #FFFFFF); }
.msv__x:hover { background: var(--color-surface-panel-hover, #2A2A2A); }
.msv__chip { background: var(--color-surface-panel, #1E1E1E); color: var(--color-chip-text, #DDD); }
.msv__chip[data-variant="completed"] { background: rgba(255,255,255,0.08); color: var(--color-gray-700, #CCC); }
.msv__empty { color: var(--color-gray-600, #A3A3A3); }
.msv__round-title { color: var(--color-gray-600, #A3A3A3); }
.msv__round-meta { color: var(--color-gray-500, #6B6B6B); }
.msv__match { background: var(--color-surface-panel-deep, #181818); border: 1px solid rgba(255,255,255,0.06); }
.msv__match[data-state="completed"] { background: var(--color-surface-panel-deepest, #161616); }
.msv__court { color: var(--color-on-surface-muted, #B0B0B0); }
.msv__pill { background: rgba(255,255,255,0.07); color: var(--color-on-surface-muted, #B0B0B0); }
.msv__pname { color: var(--color-pname-text, #C8C8C8); }
.msv__team.is-win .msv__pname { color: var(--color-on-surface, #FFFFFF); }
.msv__team.is-loss .msv__pname { color: var(--color-gray-500, #6B6B6B); }
.msv__avatar { color: var(--color-on-surface, #FFFFFF); border: 2px solid rgba(255,255,255,0.1); }
.msv__score { color: var(--color-score-muted, #888); }
.msv__colon { color: var(--color-score-dim, #555); }
.msv__vs { color: var(--color-gray-500, #6B6B6B); }
.msv__score-input {
  color: var(--color-on-surface, #FFFFFF);
  background: var(--color-gray-950, #0E0E0E);
  border: 1px solid rgba(255,255,255,0.18);
}
.msv__score-input::placeholder { color: var(--color-score-dim, #555); }
.msv__finalize { color: var(--color-brand); }
.msv__standings { background: var(--color-surface-panel-deep, #181818); border: 1px solid rgba(255,255,255,0.06); }
.msv__standings th { color: var(--color-score-muted, #888); }
.msv__standings td { color: var(--color-chip-text, #DDD); }
.msv__rank { background: rgba(255,255,255,0.07); color: var(--color-gray-700, #CCC); }
.msv__rank-name { color: var(--color-gray-800, #EEE); }
```

Every token above is one of: (a) `--color-gray-{500,600,700}`, `--color-on-surface`, `--color-on-surface-muted`, or `--color-gray-800` — real tokens confirmed in `tokens.css` to hold exactly the fallback hex shown (gray-800 `#EBEBEB` vs. fallback `#EEE` is a 3-hex-unit difference, imperceptible, an intentional near-match, not a drift bug); or (b) `--color-surface-panel`, `--color-surface-panel-hover`, `--color-surface-panel-deep`, `--color-surface-panel-deepest`, `--color-chip-text`, `--color-pname-text`, `--color-score-muted`, `--color-score-dim`, `--color-gray-950` — deliberately undefined names whose fallback always renders. Do not add any of the (b) names to `tokens.css`.

(Leave `--color-brand`, gradient/glow rgba values, and the `.msv__rank[data-rank="2"/"3"]` medal colors as-is — those are intentional accent colors, not surface/text tokens.)

- [ ] **Step 3: Animate score display with `LiCountUp` when a match completes**

Replace the completed-score `<template>` branch inside `.msv__center`:

```html
              <template v-if="m.status === 'completed'">
                <span class="msv__score" :class="{ 'is-win': (m.score_a ?? 0) > (m.score_b ?? 0) }">
                  <LiCountUp :end-val="m.score_a ?? 0" :duration="500" />
                </span>
                <span class="msv__colon">:</span>
                <span class="msv__score" :class="{ 'is-win': (m.score_b ?? 0) > (m.score_a ?? 0) }">
                  <LiCountUp :end-val="m.score_b ?? 0" :duration="500" />
                </span>
              </template>
```

- [ ] **Step 4: Animate standings columns with `LiCountUp`**

Replace the standings row cells for `played`/`won`/`lost`/`points_for`/`points_against`/`diff`:

```html
              <td><LiCountUp :end-val="s.played" :duration="600" /></td>
              <td class="msv__w"><LiCountUp :end-val="s.won" :duration="600" /></td>
              <td class="msv__l"><LiCountUp :end-val="s.lost" :duration="600" /></td>
              <td><LiCountUp :end-val="s.points_for" :duration="600" /></td>
              <td><LiCountUp :end-val="s.points_against" :duration="600" /></td>
              <td :class="diffClass(s)"><LiCountUp :end-val="diff(s)" :duration="600" /></td>
```

- [ ] **Step 5: Add the `LiCountUp` import**

```js
import { LiIcon, LiCountUp, useToast } from '../../design-system/components/index.js'
```

- [ ] **Step 6: Add haptic feedback on finalize**

In `<script setup>`, add a tiny guarded helper near the top (after the existing const declarations, before `onMounted`):

```js
function hapticTick() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(15)
  }
}
```

Then call it at the top of `handleFinalize`, right after the existing validation guard:

```js
async function handleFinalize(m) {
  const inputs = scoreOf(m)
  const a = inputs.a === '' ? null : Number(inputs.a)
  const b = inputs.b === '' ? null : Number(inputs.b)
  if (a == null || b == null) {
    toast.error('Enter both scores first.')
    return
  }
  hapticTick()
  try {
    await enterScore(m.id, a, b)
    await finalizeMatch(m.id)
    await reload()
    toast.success('Match finalized.')
  } catch (err) {
    toast.error(err.message || 'Could not finalize the match.')
  }
}
```

- [ ] **Step 7: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: PASS (4 tests) — `LiCountUp` renders its `endVal` synchronously into text on mount per its existing component behavior, so the `'Delta (guest)'` / `'Standings'` text assertions are unaffected (those assertions check names/headers, not the numeric cell values).

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/views/matches/MatchSessionView.vue
git commit -m "feat(immersive-redesign): MatchSessionView tokenize + count-up scoring + haptic finalize"
```

---

## Post-plan manual QA (not automated — do after all 4 tasks are committed)

- [ ] Click through: Meets list → a meet's detail → Join (confetti fires) → Matches tab → open/generate a session → enter + finalize a score (haptic on supported devices, count-up animates) → back to meet.
- [ ] Repeat at 375px / 768px / 1280px widths.
- [ ] ~~Toggle light/dark via the shell's `LiThemeToggle`~~ — **N/A, checked during final review:** the app went dark-only before this branch (`tokens.css:509` — `/* Dark-only app — light mode removed. All tokens above are dark-first. */`; `useTheme.js`'s `isDark`/`toggle` are permanent no-ops; `LiThemeToggle.vue` is no longer mounted anywhere in the shell). The color-token substitutions in Tasks 3/4 are still worth keeping — real tokens over hardcoded hex is good practice regardless — but there is currently no live light/dark toggle to click through. Just confirm `MeetsListView`/`MeetDetailView`/`CreateMatchFlow`/`MatchSessionView` render correctly in the app's single (dark) theme.
- [ ] Confirm `prefers-reduced-motion: reduce` (OS or browser devtools emulation) makes confetti/tilt/count-up all resolve instantly with no animation.
