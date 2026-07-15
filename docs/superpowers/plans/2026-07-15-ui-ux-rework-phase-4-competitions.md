# UI/UX Rework — Phase 4: Competitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the 3 "Competitions" views (`CompetitionsListView`, `CompetitionDetailView`, `CreateCompetitionView`) using the established `Li*`/`LiPageHeader` pattern. No navigation dead-ends were found in this group during the original design-spec audit, so — unlike Phases 2-3 — this phase is a pure restyle with no nav-fix task.

**Architecture:** Same independent-per-view approach as Phases 1-3. No new shared components. `CompetitionDetailView`'s 3 tab-visibility conditions use `v-show` (not `v-if`) today for the same reason as `MeetDetailView` in Phase 3 — hidden-tab content must stay in the DOM for a text-based test assertion (`'Eagles'`, a team name, lives in the Teams tab, index 1, not the default-active tab 0). This phase also proactively applies a lesson from Phase 3's final review: when a round/match's "Team A vs Team B" text goes into an `LiListTile` `title`/`subtitle`, add a scoped `:deep()` override removing the component's built-in truncation, since real team names can be longer than the short mocked IDs in tests.

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, the Lithium design-system (`src/design-system/components/`), plain CSS custom properties.

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-14-ui-ux-consistency-rework-design.md`. This phase implements §3 (per-view-type restyle pattern) only — the design spec's §5 navigation audit found no dead links in the Competitions group.
- **No business-logic changes.** Every composable call (`useCompetitions`, `useCompetitionRegistrations`, `useCompetitionMatches`, `useAuth`, `useClubs`) keeps identical function names, arguments, and call sites.
- **`CompetitionDetailView`'s tab panels MUST stay `v-show`, never `v-if`.** Same reasoning as `MeetDetailView` in Phase 3: `CompetitionDetailView.spec.js`'s `'Eagles'` assertion (a team name) lives in the Teams tab (index 1), not the default-active tab (`activeTab` starts at `0`, showing Details). `v-show` keeps that markup in the DOM; `v-if` would silently break the test.
- **`CreateCompetitionView` already correctly avoids the `LiTextField`/`v-model.number` pitfall** — its `max_participants`/`fee_amount` fields use plain `v-model` (no `.number` modifier) and are `Number()`-coerced explicitly in `handleSubmit` (see the existing code comment). This is intentional, already-correct code from an earlier phase — do not "fix" it by adding `.number` modifiers or changing the coercion approach; the LiGlassCard swap task must leave this logic untouched.
- **Truncation-prevention pattern (carried forward from Phase 3):** where a round/match's team-vs-team text goes into an `LiListTile` `title` or `subtitle` prop, add a scoped `:deep()` CSS override removing that prop's built-in `white-space`/`overflow`/`line-clamp` truncation within this view, since `LiListTile`'s defaults (built for dense contact-style lists) would otherwise risk clipping real team names — even though the existing mocked test data (short IDs) wouldn't catch it. This is applied in Task 3 from the start, not left for a later review round.
- **Preserve every existing spec assertion exactly.** All 3 tasks in this phase need **zero** spec-file changes — this phase found no new behavior requiring a new test (no nav-fix, unlike Phases 2-3).
- **Breakpoint convention:** literal `480px`/`768px`/`1024px` only — this phase doesn't need new `@media` rules; `LiPageHeader`'s built-in `flex-wrap` handles header-row wrapping, and the standings table gets a plain `overflow-x: auto` wrapper.
- **No new npm dependencies, no new design-system components.** Everything needed (`LiPageHeader`, `LiGlassCard`, `LiCard`, `LiListTile`, `LiRevealOnScroll`) already exists from earlier phases.
- **Dark mode:** only semantic tokens (`--color-on-surface`, `--color-gray-*`, etc.) — no new hardcoded hex colors.

## File Structure

- Modify: `src/views/competitions/CompetitionsListView.vue` (LiPageHeader + LiRevealOnScroll grid)
- Modify: `src/views/competitions/CreateCompetitionView.vue` (LiCard → LiGlassCard only)
- Modify: `src/views/competitions/CompetitionDetailView.vue` (LiPageHeader + LiCard/LiListTile teams + rounds, with truncation-prevention CSS)

---

### Task 1: CompetitionsListView — LiPageHeader + LiRevealOnScroll grid

**Files:**
- Modify: `src/views/competitions/CompetitionsListView.vue` (full file)
- Test: `src/views/competitions/CompetitionsListView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiRevealOnScroll` (existing, from earlier phases).

**Preserve exactly:** `listCompetitions` called on mount; `wrapper.text()` contains `'Sunday Cup'` (via the existing `RouterLinkStub`) and `'Create competition'` (button text).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/competitions/CompetitionsListView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/competitions/CompetitionsListView.vue` in full**

```vue
<template>
  <section class="comps-list-view">
    <LiPageHeader title="Competitions" subtitle="Round-robin leagues and knockout brackets.">
      <template #actions>
        <LiButton @click="$router.push('/competitions/new')">Create competition</LiButton>
      </template>
    </LiPageHeader>

    <LiEmptyState v-if="competitions.length === 0" title="No competitions yet" icon="trophy" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="comps-list-view__list">
        <LiCard v-for="comp in competitions" :key="comp.id" hover>
          <router-link :to="`/competitions/${comp.id}`">
            <h3>{{ comp.name }}</h3>
            <p>{{ comp.format }} · {{ comp.status }}</p>
          </router-link>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, LiPageHeader, LiRevealOnScroll, useToast } from '../../design-system/components/index.js'
import { useCompetitions } from '../../composables/useCompetitions.js'

const { listCompetitions } = useCompetitions()
const toast = useToast()
const competitions = ref([])

onMounted(async () => {
  try {
    competitions.value = await listCompetitions()
  } catch (err) {
    toast.error(err.message || 'Could not load competitions.')
  }
})
</script>

<style scoped>
.comps-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.comps-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/competitions/CompetitionsListView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/competitions/CompetitionsListView.vue
git commit -m "feat(ui-rework): restyle CompetitionsListView with LiPageHeader"
```

---

### Task 2: CreateCompetitionView — LiCard → LiGlassCard

**Files:**
- Modify: `src/views/competitions/CreateCompetitionView.vue` (full file)
- Test: `src/views/competitions/CreateCompetitionView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiGlassCard` (existing).

**Preserve exactly:** `wrapper.text()` contains `'Create competition'` and `'Padel Brow'` (club option); clicking the submit button calls `createCompetition` with a payload whose `fee_amount` is a real `number` (not a string) — this depends on the existing `Number()`-coercion in `handleSubmit`, which must NOT change.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/competitions/CreateCompetitionView.spec.js`
Expected: PASS (2 tests)

- [ ] **Step 2: Replace `src/views/competitions/CreateCompetitionView.vue` in full**

```vue
<template>
  <section class="create-comp-view">
    <h1>Create competition</h1>
    <LiGlassCard class="create-comp-view__card">
      <div class="create-comp-view__form">
        <LiSelect v-model="form.club_id" label="Club" :options="clubOptions" placeholder="Select a club" />
        <LiTextField v-model="form.name" label="Name" placeholder="Sunday Cup" />
        <LiSelect
          v-model="form.format"
          label="Format"
          :options="[
            { value: 'round_robin', label: 'Round robin' },
            { value: 'single_elim', label: 'Single elimination' },
          ]"
        />
        <LiTextField v-model="form.registration_opens_at" type="datetime-local" label="Registration opens" />
        <LiTextField v-model="form.registration_closes_at" type="datetime-local" label="Registration closes" />
        <LiTextField v-model="form.starts_at" type="datetime-local" label="Starts at" />
        <LiTextField v-model="form.max_participants" type="number" label="Max participants" />
        <LiTextField v-model="form.fee_amount" type="number" label="Fee (IDR)" />
        <p v-if="errorMessage" class="create-comp-view__error">{{ errorMessage }}</p>
        <LiButton :loading="submitting" @click="handleSubmit">Create competition</LiButton>
      </div>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiGlassCard, LiButton, LiTextField, LiSelect, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useCompetitions } from '../../composables/useCompetitions.js'

const router = useRouter()
const { user } = useAuth()
const { listClubs } = useClubs()
const { createCompetition } = useCompetitions()
const toast = useToast()

const clubs = ref([])
const submitting = ref(false)
const errorMessage = ref('')
const form = ref({
  club_id: '',
  name: '',
  format: 'round_robin',
  registration_opens_at: '',
  registration_closes_at: '',
  starts_at: '',
  max_participants: '8',
  fee_amount: '0',
})

const clubOptions = computed(() => clubs.value.map((c) => ({ value: c.id, label: c.name })))

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
    const payload = {
      name: form.value.name,
      format: form.value.format,
      registration_opens_at: form.value.registration_opens_at || null,
      registration_closes_at: form.value.registration_closes_at || null,
      starts_at: form.value.starts_at || null,
      // Number()-coerce: v-model.number is a no-op on LiTextField, so these
      // arrive as strings. Coerce explicitly; empty → null so NOT NULL/cast
      // constraints in Postgres don't reject a blank field.
      max_participants: form.value.max_participants === '' ? null : Number(form.value.max_participants),
      fee_amount: form.value.fee_amount === '' ? 0 : Number(form.value.fee_amount),
    }
    const comp = await createCompetition(payload, form.value.club_id)
    router.push({ name: 'competition-detail', params: { id: comp.id } })
  } catch (err) {
    errorMessage.value = err.message || 'Could not create the competition.'
    toast.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-comp-view {
  max-width: 560px;
  margin: 0 auto;
}

.create-comp-view__card {
  display: flex;
  flex-direction: column;
}

.create-comp-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-comp-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/competitions/CreateCompetitionView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/competitions/CreateCompetitionView.vue
git commit -m "feat(ui-rework): restyle CreateCompetitionView with LiGlassCard"
```

---

### Task 3: CompetitionDetailView — LiPageHeader + LiCard/LiListTile teams + rounds

**Files:**
- Modify: `src/views/competitions/CompetitionDetailView.vue` (full file)
- Test: `src/views/competitions/CompetitionDetailView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiGlassCard`, `LiListTile` (existing design-system components).

**Preserve exactly:** `getCompetition` called with `'co1'`; `wrapper.text()` contains `'Cup'` (competition name) and `'Eagles'` (team name — **must stay reachable via `v-show`, not `v-if`**, since it lives in the Teams tab, not the default-active Details tab).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/competitions/CompetitionDetailView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/competitions/CompetitionDetailView.vue` in full**

```vue
<template>
  <section v-if="comp" class="comp-detail-view">
    <LiPageHeader :title="comp.name">
      <template #actions>
        <LiBadge :label="comp.status" :variant="statusVariant(comp.status)" />
        <LiButton v-if="isOrganizer && comp.status === 'draft'" @click="handleOpenRegistration">Open registration</LiButton>
        <LiButton
          v-if="isOrganizer && comp.status === 'registration_open'"
          :disabled="confirmedTeams.length < 2"
          @click="handleGenerate"
        >
          Generate matches
        </LiButton>
      </template>
    </LiPageHeader>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="comp-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiCard>
          <p>Format: {{ comp.format }}</p>
          <p v-if="comp.registration_opens_at">Registration opens: {{ formatWhen(comp.registration_opens_at) }}</p>
          <p v-if="comp.registration_closes_at">Registration closes: {{ formatWhen(comp.registration_closes_at) }}</p>
        </LiCard>
      </div>

      <!-- Teams -->
      <div v-show="activeTab === 1">
        <LiGlassCard class="comp-detail-view__register">
          <form @submit.prevent="handleRegister">
            <LiTextField v-model="newTeam.name" placeholder="Team name" />
            <LiTextField v-model="newTeam.players" placeholder="Player IDs, comma-separated" />
            <LiButton type="submit" :loading="registering">Register team</LiButton>
          </form>
        </LiGlassCard>
        <LiCard flush>
          <LiListTile v-for="reg in registrations" :key="reg.team_id" :title="reg.competition_teams.name">
            <template #trailing>
              <LiBadge v-if="reg.status === 'confirmed'" :label="`Seed ${reg.seed}`" variant="success" />
              <LiBadge v-else label="Pending" variant="warning" />
              <LiButton v-if="reg.status === 'pending' && isOrganizer" size="sm" @click="handleConfirm(reg)">Confirm + seed</LiButton>
            </template>
          </LiListTile>
        </LiCard>
      </div>

      <!-- Standings (round_robin): matches with score entry + standings table -->
      <div v-show="activeTab === 2 && comp.format === 'round_robin'">
        <div v-if="matches.length" class="comp-detail-view__rounds">
          <LiCard v-for="round in matchesByRound" :key="round.name" flush class="comp-detail-view__round">
            <h3 class="comp-detail-view__round-title">{{ round.name }}</h3>
            <LiListTile
              v-for="m in round.matches"
              :key="m.id"
              :title="`${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`"
            >
              <template #trailing>
                <span v-if="m.status === 'completed'" class="comp-detail-view__match-score">{{ m.score_a }}-{{ m.score_b }}</span>
                <div v-else-if="isOrganizer && m.team_a_id && m.team_b_id" class="comp-detail-view__score">
                  <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
                  <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
                  <LiButton size="sm" @click="handleScore(m)">Save</LiButton>
                </div>
              </template>
            </LiListTile>
          </LiCard>
        </div>
        <div class="comp-detail-view__standings-scroll">
          <table class="comp-detail-view__standings-table">
            <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in standings" :key="s.team_id">
                <td>{{ i + 1 }}</td>
                <td>{{ teamName(s.team_id) }}</td>
                <td>{{ s.played }}</td><td>{{ s.won }}</td><td>{{ s.lost }}</td>
                <td>{{ s.points_for }}</td><td>{{ s.points_against }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bracket (single_elim) -->
      <div v-show="activeTab === 2 && comp.format === 'single_elim'">
        <LiCard v-for="round in matchesByRound" :key="round.name" flush class="comp-detail-view__round">
          <h3 class="comp-detail-view__round-title">{{ round.name }}</h3>
          <LiListTile
            v-for="m in round.matches"
            :key="m.id"
            :title="`${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`"
          >
            <template #trailing>
              <span v-if="m.status === 'completed'" class="comp-detail-view__match-score">{{ m.score_a }}-{{ m.score_b }}</span>
              <div v-else-if="isOrganizer && m.team_a_id && m.team_b_id" class="comp-detail-view__score">
                <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
                <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
                <LiButton size="sm" @click="handleScore(m)">Save</LiButton>
              </div>
            </template>
          </LiListTile>
        </LiCard>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiTabs, LiButton, LiBadge, LiTextField, LiCard, LiGlassCard, LiListTile, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useCompetitions } from '../../composables/useCompetitions.js'
import { useCompetitionRegistrations } from '../../composables/useCompetitionRegistrations.js'
import { useCompetitionMatches } from '../../composables/useCompetitionMatches.js'

const route = useRoute()
const { user } = useAuth()
const { getMyMembership } = useClubs()
const { getCompetition, openRegistration, generateMatches } = useCompetitions()
const { listRegistrations, registerTeam, confirmRegistration } = useCompetitionRegistrations()
const { listMatches, enterScore, computeStandingsFor } = useCompetitionMatches()
const toast = useToast()

const comp = ref(null)
const registrations = ref([])
const matches = ref([])
const activeTab = ref(0)
const newTeam = ref({ name: '', players: '' })
const registering = ref(false)
// best-effort organizer flag for UX (hide organizer-only controls); RLS is the real gate.
const isOrganizer = ref(false)
// Per-match score-input cache, lazily created on first render of each match.
const scoreCache = reactive({})

// ponytail: LiTabs expects tabs as [{ label }], not bare strings — adjusted from brief's string array to match the vendored component's real API.
const tabs = computed(() => [
  { label: 'Details' },
  { label: 'Teams' },
  { label: comp.value?.format === 'single_elim' ? 'Bracket' : 'Standings' },
])

const confirmedTeams = computed(() =>
  registrations.value
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    .map((r) => ({ id: r.team_id }))
)

const standings = computed(() =>
  computeStandingsFor(matches.value, registrations.value.map((r) => r.team_id))
)

// round_name comes back alphabetically from the DB; derive a display ordinal so
// rounds render in bracket/league order (Quarterfinal → Semifinal → Final,
// Round 1 → Round 2 → … → Round 10). ponytail: tied to bracketRoundName +
// generateRoundRobin naming conventions; replace with a round_index column if
// round names ever diverge.
function roundOrdinal(name) {
  if (name === 'Final') return 1e6
  if (name === 'Semifinal') return 1e6 - 1
  if (name === 'Quarterfinal') return 1e6 - 2
  const of = name.match(/Round of (\d+)/)
  if (of) return -parseInt(of[1], 10)
  const r = name.match(/Round (\d+)/)
  if (r) return parseInt(r[1], 10)
  return 0
}

const matchesByRound = computed(() => {
  const byRound = {}
  for (const m of matches.value) {
    byRound[m.round_name] = byRound[m.round_name] || { name: m.round_name, matches: [] }
    byRound[m.round_name].matches.push(m)
  }
  return Object.values(byRound).sort((a, b) => roundOrdinal(a.name) - roundOrdinal(b.name))
})

function teamName(id) {
  if (!id) return 'TBD'
  const reg = registrations.value.find((r) => r.team_id === id)
  return reg ? reg.competition_teams.name : '—'
}

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

async function reload() {
  registrations.value = await listRegistrations(route.params.id)
  matches.value = await listMatches(route.params.id)
}

onMounted(async () => {
  try {
    comp.value = await getCompetition(route.params.id)
    await reload()
    if (user.value && comp.value) {
      try {
        const membership = await getMyMembership(comp.value.club_id, user.value.id)
        isOrganizer.value = membership?.role === 'owner' || membership?.role === 'organizer'
      } catch {
        isOrganizer.value = false
      }
    }
  } catch (err) {
    toast.error(err.message || 'Could not load this competition.')
  }
})

async function handleOpenRegistration() {
  try {
    comp.value = await openRegistration(route.params.id)
  } catch (err) {
    toast.error(err.message || 'Could not open registration.')
  }
}

async function handleGenerate() {
  try {
    await generateMatches(comp.value, confirmedTeams.value)
    matches.value = await listMatches(route.params.id)
    comp.value = await getCompetition(route.params.id)
    toast.success('Matches generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate matches.')
  }
}

async function handleRegister() {
  if (!newTeam.value.name.trim()) return
  registering.value = true
  try {
    const playerIds = newTeam.value.players.split(',').map((s) => s.trim()).filter(Boolean)
    await registerTeam(route.params.id, { name: newTeam.value.name.trim(), playerIds })
    newTeam.value = { name: '', players: '' }
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not register the team.')
  } finally {
    registering.value = false
  }
}

async function handleConfirm(reg) {
  // Next seed = (max confirmed seed) + 1
  const nextSeed = registrations.value.reduce((mx, r) => Math.max(mx, r.seed ?? 0), 0) + 1
  try {
    await confirmRegistration(route.params.id, reg.team_id, nextSeed)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not confirm the team.')
  }
}

async function handleScore(m) {
  const inputs = scoreOf(m)
  const a = inputs.a === '' ? null : Number(inputs.a)
  const b = inputs.b === '' ? null : Number(inputs.b)
  try {
    await enterScore(m.id, a, b)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not save the score.')
  }
}

function statusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  if (status === 'registration_open') return 'brand'
  return 'neutral'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.comp-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.comp-detail-view__register {
  margin-bottom: var(--space-m, 16px);
}

.comp-detail-view__register form {
  display: flex;
  gap: var(--space-s, 8px);
}

.comp-detail-view__round {
  margin-bottom: var(--space-s, 8px);
}

.comp-detail-view__round-title {
  padding: var(--space-m, 16px) var(--space-m, 16px) 0;
  margin: 0 0 var(--space-s, 8px);
}

/* Team names can be longer than LiListTile's default single-line
   ellipsis assumes (built for dense contact-style lists) — always show
   the full matchup in this competitions-round context. */
.comp-detail-view__round :deep(.li-list-tile-title) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.comp-detail-view__match-score {
  font-weight: 600;
}

.comp-detail-view__score {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 4px);
}

.comp-detail-view__score-input {
  width: 56px;
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border: 1px solid var(--color-gray-300, #CCC);
  border-radius: var(--radius-s, 6px);
  font-size: var(--text-sm, 14px);
}

.comp-detail-view__standings-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: var(--space-m, 16px);
}

.comp-detail-view__standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs, 14px);
}

.comp-detail-view__standings-table th,
.comp-detail-view__standings-table td {
  padding: var(--space-s, 8px);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-200, #E6E6E6);
}
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/competitions/CompetitionDetailView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/competitions/CompetitionDetailView.vue
git commit -m "feat(ui-rework): restyle CompetitionDetailView with LiPageHeader + LiListTile"
```

---

## Self-Review

**1. Spec coverage:** §3's list/detail/form restyle patterns applied to all 3 views. No §5 nav-fix item exists for this group (confirmed against the design spec's audit — Competitions had no dead links). The Phase-3-derived truncation-prevention lesson is applied proactively in Task 3, not deferred to a final-review fix round.

**2. Placeholder scan:** No TBD/TODO; every step has complete code.

**3. Type consistency:** `LiPageHeader`'s `title`/`#actions` and `LiListTile`'s `title`/`#trailing` are used identically to how earlier phases established them. The `:deep(.li-list-tile-title)` override in Task 3 mirrors the exact pattern (and reasoning) used for `.li-list-tile-subtitle` in Phase 3's `MatchSessionView` fix.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-ui-ux-rework-phase-4-competitions.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
