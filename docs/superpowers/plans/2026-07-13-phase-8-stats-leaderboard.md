# Phase 8 — Stats, History & Leaderboard Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Global skill-rating leaderboard with a podium treatment + PNG export, plus a personal stats / match-history view.

**Architecture:** `player_ratings` (written by the Phase 4 `apply_match_result` RPC) is the leaderboard source; `match_players` joined to `matches`+`meets` is the personal-history source. A `useStats` composable reads both. `LeaderboardView` renders a #1/#2/#3 podium (gold/silver/bronze) + ranked list and exports the standings node to PNG via `html-to-image` (client-side, no server round-trip). `PersonalStatsView` shows the user's rating + reliability + derived W/L/win% and a match-history list.

**Tech Stack:** Vue 3 Composition API, Vite, Supabase (Postgres + RLS), `html-to-image` (new dep — justified: styled-DOM→PNG needs foreignObject/canvas/font embedding, not a few lines), Vitest + @vue/test-utils.

## Global Constraints

- Vue 3 `<script setup>`, Vite, Vue Router hash mode.
- NEVER edit `src/design-system/` (vendored Lithium `Li*`). `LiBadge`/`LiButton`/`useToast` available.
- `v-model.number` is a no-op on vendored `LiTextField` — use native `<input>` for numerics.
- Tests use real `ref()` for `useAuth().user`, slot-forwarding `RouterLinkStub`, and chainable Supabase mock builders (canonical pattern: `src/composables/useFeed.spec.js`). Top-level `vi.fn()`s may be referenced inside `vi.mock` factories ONLY within a nested `vi.fn(() => ({ … }))` callback (lazy); direct property values cause a TDZ hoist error — use `vi.hoisted` if needed.
- `player_ratings` has NO client insert/update policy (Phase 1 RLS fix removed it) — read-only from the client; Elo writes go through `apply_match_result`. `player_ratings_select_authenticated` allows any authenticated user to read.
- `match_players` has one FK to `profiles` (user_id) and one to `matches` (match_id); `matches` has one FK to `meets` (meet_id). Embeds are unqualified: `match:matches(..., meet:meets(...))`.
- Mutation handlers catch + `toast.error(err.message || '…')`.
- Work directly on `main`. Migrations pushed via `npx supabase db push`. Git push to origin is NOT done unless asked.

## File Structure

- `package.json` — add `html-to-image` dependency.
- `src/composables/useStats.js` — NEW: getLeaderboard, getPersonalHistory, getPersonalStats.
- `src/composables/useStats.spec.js` — NEW.
- `src/components/stats/Podium.vue` — NEW: #1/#2/#3 podium (gold/silver/bronze).
- `src/views/LeaderboardView.vue` — NEW: podium + ranked list + Export-to-PNG.
- `src/views/LeaderboardView.spec.js` — NEW.
- `src/views/PersonalStatsView.vue` — NEW: aggregate stats + match history.
- `src/views/PersonalStatsView.spec.js` — NEW.
- `src/router/index.js` — add `/leaderboard` + `/stats` routes.
- `src/layouts/AppLayout.vue` — add Leaderboard nav link.

---

### Task 1: useStats composable

**Files:**
- Create: `src/composables/useStats.js`
- Test: `src/composables/useStats.spec.js`

**Interfaces:**
- Produces:
  - `getLeaderboard() => Promise<row[]>` — `player_ratings` select `user_id, rating, matches_played, reliability_pct, user:profiles(id, full_name, avatar_url)`, ordered `rating desc`, limit 50.
  - `getPersonalHistory(userId) => Promise<row[]>` — `match_players` select `team, match:matches(id, status, score_a, score_b, created_at, meet:meets(id, title, starts_at))`, `eq('user_id', userId)`, ordered `created_at desc` (on the match) — implemented as `match:matches(...)` then `.order('created_at', { referencedTable: 'match', ascending: false })`. Each row carries the user's `team` so the view can derive win/loss.
  - `getPersonalStats(userId) => Promise<row|null>` — `player_ratings` select `*`, `eq('user_id', userId)`, `.maybeSingle()`.

- [ ] **Step 1: Write the failing test**

Create `src/composables/useStats.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../lib/supabase.js'
import { useStats } from './useStats.js'

function chain(resolved) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    limit: vi.fn(() => self),
    maybeSingle: vi.fn(() => self),
    then: (resolve) => resolve(resolved),
  }
  return self
}

describe('useStats', () => {
  beforeEach(() => supabase.from.mockReset())

  it('getLeaderboard orders by rating desc + limits 50 + embeds profiles', async () => {
    const c = chain({ data: [{ user_id: 'u1', rating: 5, user: { full_name: 'A' } }], error: null })
    supabase.from.mockReturnValue(c)
    const { getLeaderboard } = useStats()
    const rows = await getLeaderboard()
    expect(supabase.from).toHaveBeenCalledWith('player_ratings')
    expect(c.order).toHaveBeenCalledWith('rating', { ascending: false })
    expect(c.limit).toHaveBeenCalledWith(50)
    expect(rows[0].user.full_name).toBe('A')
  })

  it('getPersonalHistory filters by user_id + embeds match+meet, ordered by match.created_at desc', async () => {
    const c = chain({ data: [{ team: 'a', match: { id: 'm1', status: 'completed', score_a: 21, score_b: 15, meet: { title: 'Tue' } } }], error: null })
    supabase.from.mockReturnValue(c)
    const { getPersonalHistory } = useStats()
    const rows = await getPersonalHistory('u1')
    expect(supabase.from).toHaveBeenCalledWith('match_players')
    expect(c.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(c.order).toHaveBeenCalledWith('created_at', { referencedTable: 'match', ascending: false })
    expect(rows[0].match.meet.title).toBe('Tue')
  })

  it('getPersonalStats maybeSingle on player_ratings', async () => {
    const c = chain({ data: { user_id: 'u1', rating: 4.2, matches_played: 9 }, error: null })
    supabase.from.mockReturnValue(c)
    const { getPersonalStats } = useStats()
    const row = await getPersonalStats('u1')
    expect(supabase.from).toHaveBeenCalledWith('player_ratings')
    expect(c.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(c.maybeSingle).toHaveBeenCalled()
    expect(row.rating).toBe(4.2)
  })

  it('throws on error', async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: 'boom' } }))
    const { getLeaderboard } = useStats()
    await expect(getLeaderboard()).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/composables/useStats.spec.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

Create `src/composables/useStats.js`:

```js
import { supabase } from '../lib/supabase.js'

export function useStats() {
  async function getLeaderboard() {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('user_id, rating, matches_played, reliability_pct, user:profiles(id, full_name, avatar_url)')
      .order('rating', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  }

  async function getPersonalHistory(userId) {
    const { data, error } = await supabase
      .from('match_players')
      .select('team, match:matches(id, status, score_a, score_b, created_at, meet:meets(id, title, starts_at))')
      .eq('user_id', userId)
      .order('created_at', { referencedTable: 'match', ascending: false })
    if (error) throw error
    return data
  }

  async function getPersonalStats(userId) {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { getLeaderboard, getPersonalHistory, getPersonalStats }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/composables/useStats.spec.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useStats.js src/composables/useStats.spec.js
git commit -m "feat(p8): useStats composable — leaderboard + history + personal stats"
```

---

### Task 2: LeaderboardView with podium + PNG export

**Files:**
- Create: `src/components/stats/Podium.vue`
- Create: `src/views/LeaderboardView.vue`
- Test: `src/views/LeaderboardView.spec.js`
- Modify: `package.json` (add `html-to-image`)

**Interfaces:**
- Consumes: `useStats.getLeaderboard()`, `useAuth` (for highlighting the current user), `html-to-image`'s `toPng`, `useToast`.
- `Podium.vue` props: `players: Array` (exactly the top 3, each `{ user_id, rating, matches_played, user: { full_name, avatar_url } }`). Renders #2 / #1 / #3 left-to-right with #1 elevated; gold/silver/bronze accent classes.
- `LeaderboardView.vue`: loads leaderboard on mount, renders `<Podium :players="top3" />` + a ranked list (rank 4+), an Export button that calls `toPng(standingsRef)` and triggers a download. Highlights the current user's row.

- [ ] **Step 1: Install html-to-image**

Run: `npm install html-to-image`
Expected: `html-to-image` added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the Podium component**

Create `src/components/stats/Podium.vue`:

```vue
<template>
  <div class="podium" v-if="players.length">
    <div class="podium__step podium__step--silver" v-if="players[1]">
      <span class="podium__medal">2</span>
      <span class="podium__name">{{ players[1].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[1].rating).toFixed(1) }}</span>
    </div>
    <div class="podium__step podium__step--gold" v-if="players[0]">
      <span class="podium__medal">1</span>
      <span class="podium__name">{{ players[0].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[0].rating).toFixed(1) }}</span>
    </div>
    <div class="podium__step podium__step--bronze" v-if="players[2]">
      <span class="podium__medal">3</span>
      <span class="podium__name">{{ players[2].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[2].rating).toFixed(1) }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ players: { type: Array, default: () => [] } })
</script>

<style scoped>
.podium { display: flex; align-items: flex-end; justify-content: center; gap: var(--space-s, 8px); }
.podium__step { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs, 4px); padding: var(--space-m, 16px); border-radius: var(--radius-m, 12px); min-width: 96px; }
.podium__step--gold { background: linear-gradient(180deg, #FFD70033, #FFD70011); border: 2px solid #FFD700; transform: translateY(-12px); }
.podium__step--silver { background: linear-gradient(180deg, #C0C0C033, #C0C0C011); border: 2px solid #C0C0C0; }
.podium__step--bronze { background: linear-gradient(180deg, #CD7F3233, #CD7F3211); border: 2px solid #CD7F32; }
.podium__medal { font-weight: 700; font-size: 1.25rem; }
.podium__name { font-weight: 600; }
.podium__rating { font-size: 0.9rem; opacity: 0.8; }
</style>
```

- [ ] **Step 3: Write the LeaderboardView failing test**

Create `src/views/LeaderboardView.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getLeaderboard = vi.fn().mockResolvedValue([
  { user_id: 'u1', rating: 5.5, matches_played: 10, user: { full_name: 'Me' } },
  { user_id: 'u2', rating: 4.4, matches_played: 8, user: { full_name: 'A' } },
  { user_id: 'u3', rating: 3.3, matches_played: 6, user: { full_name: 'B' } },
  { user_id: 'u4', rating: 2.2, matches_played: 4, user: { full_name: 'C' } },
])
vi.mock('../composables/useStats.js', () => ({ useStats: vi.fn(() => ({ getLeaderboard })) }))

const toPng = vi.fn().mockResolvedValue('data:image/png;base64,abc')
vi.mock('html-to-image', () => ({ toPng }))

// jsdom lacks URL.createObjectURL + a.click() download plumbing — stub them.
globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake')
globalThis.URL.revokeObjectURL = vi.fn()

import LeaderboardView from './LeaderboardView.vue'

describe('LeaderboardView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the leaderboard + renders the podium + ranked list', async () => {
    const wrapper = mount(LeaderboardView)
    await flushPromises()
    expect(getLeaderboard).toHaveBeenCalled()
    // Podium shows #1 (Me) elevated.
    expect(wrapper.text()).toContain('Me')
    expect(wrapper.text()).toContain('C')
  })

  it('export button calls toPng on the standings node', async () => {
    const wrapper = mount(LeaderboardView)
    await flushPromises()
    await wrapper.find('[data-testid="export-png"]').trigger('click')
    await flushPromises()
    expect(toPng).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/views/LeaderboardView.spec.js`
Expected: FAIL (component not found).

- [ ] **Step 5: Write LeaderboardView.vue**

Create `src/views/LeaderboardView.vue`:

```vue
<template>
  <section class="leaderboard-view">
    <div class="leaderboard-view__head">
      <h1>Leaderboard</h1>
      <LiButton data-testid="export-png" :loading="exporting" @click="handleExport">Export PNG</LiButton>
    </div>

    <div ref="standingsRef" class="leaderboard-view__standings">
      <Podium v-if="rows.length >= 3" :players="rows.slice(0, 3)" />
      <ul class="leaderboard-view__list">
        <li
          v-for="(r, i) in rows.slice(3)"
          :key="r.user_id"
          class="leaderboard-view__row"
          :class="{ 'leaderboard-view__row--me': r.user_id === user?.id }"
        >
          <span class="leaderboard-view__rank">{{ i + 4 }}</span>
          <span class="leaderboard-view__name">{{ r.user?.full_name }}</span>
          <span class="leaderboard-view__rating">{{ Number(r.rating).toFixed(1) }}</span>
          <span class="leaderboard-view__played">{{ r.matches_played }} played</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useStats } from '../composables/useStats.js'
import { toPng } from 'html-to-image'
import Podium from '../components/stats/Podium.vue'

const toast = useToast()
const { user } = useAuth()
const { getLeaderboard } = useStats()

const rows = ref([])
const standingsRef = ref(null)
const exporting = ref(false)

onMounted(async () => {
  try {
    rows.value = await getLeaderboard()
  } catch (err) {
    toast.error(err.message || 'Could not load the leaderboard.')
  }
})

async function handleExport() {
  if (!standingsRef.value) return
  exporting.value = true
  try {
    const dataUrl = await toPng(standingsRef.value, { cacheBust: true })
    const link = document.createElement('a')
    link.download = 'leaderboard.png'
    link.href = dataUrl
    link.click()
    toast.success('Exported.')
  } catch (err) {
    toast.error(err.message || 'Could not export.')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.leaderboard-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.leaderboard-view__head { display: flex; align-items: center; justify-content: space-between; }
.leaderboard-view__standings { display: flex; flex-direction: column; gap: var(--space-m, 16px); background: var(--color-surface, #fff); padding: var(--space-m, 16px); border-radius: var(--radius-m, 12px); }
.leaderboard-view__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.leaderboard-view__row { display: grid; grid-template-columns: 2rem 1fr auto auto; gap: var(--space-s, 8px); align-items: center; padding: var(--space-s, 8px); border-radius: var(--radius-s, 6px); }
.leaderboard-view__row--me { background: var(--color-brand-50, #eef; ); font-weight: 600; }
.leaderboard-view__rank { opacity: 0.6; }
.leaderboard-view__rating { font-weight: 600; }
.leaderboard-view__played { opacity: 0.6; font-size: 0.85rem; }
</style>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/views/LeaderboardView.spec.js`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/components/stats/Podium.vue src/views/LeaderboardView.vue src/views/LeaderboardView.spec.js
git commit -m "feat(p8): LeaderboardView with podium + PNG export"
```

---

### Task 3: PersonalStatsView (aggregate stats + match history)

**Files:**
- Create: `src/views/PersonalStatsView.vue`
- Test: `src/views/PersonalStatsView.spec.js`

**Interfaces:**
- Consumes: `useStats.getPersonalStats(userId)` + `useStats.getPersonalHistory(userId)`, `useAuth`.
- Renders: a stats card (rating, matches_played, reliability_pct, derived wins/losses/win%), and a match-history list. Each history row derives the result from `team` + `match.score_a`/`match.score_b` (only `status === 'completed'`): if `team === 'a'`, won = `score_a > score_b`; if `team === 'b'`, won = `score_b > score_a`. Shows `meet.title`, the score, and a W/L badge.

- [ ] **Step 1: Write the failing test**

Create `src/views/PersonalStatsView.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getPersonalStats = vi.fn().mockResolvedValue({ user_id: 'u1', rating: 4.2, matches_played: 9, reliability_pct: 88 })
const getPersonalHistory = vi.fn().mockResolvedValue([
  { team: 'a', match: { id: 'm1', status: 'completed', score_a: 21, score_b: 15, meet: { title: 'Tue Night' } } },
  { team: 'b', match: { id: 'm2', status: 'completed', score_a: 21, score_b: 10, meet: { title: 'Thu Night' } } },
])
vi.mock('../composables/useStats.js', () => ({ useStats: vi.fn(() => ({ getPersonalStats, getPersonalHistory })) }))

import PersonalStatsView from './PersonalStatsView.vue'

describe('PersonalStatsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads stats + history and derives W/L', async () => {
    const wrapper = mount(PersonalStatsView)
    await flushPromises()
    expect(getPersonalStats).toHaveBeenCalledWith('u1')
    expect(getPersonalHistory).toHaveBeenCalledWith('u1')
    // m1: team a, 21-15 → won. m2: team b, 21-10 → lost (score_a is opponent's).
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('21-15')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/views/PersonalStatsView.spec.js`
Expected: FAIL (component not found).

- [ ] **Step 3: Write PersonalStatsView.vue**

Create `src/views/PersonalStatsView.vue`:

```vue
<template>
  <section class="stats-view">
    <h1>My stats</h1>

    <div class="stats-view__card" v-if="stats">
      <div><span>Rating</span><strong>{{ Number(stats.rating).toFixed(1) }}</strong></div>
      <div><span>Played</span><strong>{{ stats.matches_played }}</strong></div>
      <div><span>Reliability</span><strong>{{ Math.round(stats.reliability_pct) }}%</strong></div>
      <div><span>Wins</span><strong>{{ wins }}</strong></div>
      <div><span>Losses</span><strong>{{ losses }}</strong></div>
      <div><span>Win %</span><strong>{{ winPct }}%</strong></div>
    </div>

    <h2>Match history</h2>
    <ul class="stats-view__history">
      <li v-for="h in history" :key="h.match.id" class="stats-view__match">
        <span class="stats-view__title">{{ h.match.meet?.title || 'Match' }}</span>
        <span class="stats-view__score">{{ h.match.score_a }}-{{ h.match.score_b }}</span>
        <LiBadge v-if="h.match.status === 'completed'" :label="resultOf(h) ? 'W' : 'L'" :variant="resultOf(h) ? 'success' : 'danger'" />
        <LiBadge v-else label="pending" variant="neutral" />
      </li>
      <li v-if="!history.length" class="stats-view__empty">No matches yet.</li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useStats } from '../composables/useStats.js'

const toast = useToast()
const { user } = useAuth()
const { getPersonalStats, getPersonalHistory } = useStats()

const stats = ref(null)
const history = ref([])

const completed = computed(() => history.value.filter((h) => h.match.status === 'completed' && h.match.score_a != null && h.match.score_b != null))
const wins = computed(() => completed.value.filter(resultOf).length)
const losses = computed(() => completed.value.length - wins.value)
const winPct = computed(() => (completed.value.length ? Math.round((wins.value / completed.value.length) * 100) : 0))

function resultOf(h) {
  if (!h.match || h.match.score_a == null || h.match.score_b == null) return false
  return h.team === 'a' ? h.match.score_a > h.match.score_b : h.match.score_b > h.match.score_a
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [s, h] = await Promise.all([getPersonalStats(user.value.id), getPersonalHistory(user.value.id)])
    stats.value = s
    history.value = h
  } catch (err) {
    toast.error(err.message || 'Could not load your stats.')
  }
})
</script>

<style scoped>
.stats-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.stats-view__card { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-s, 8px); }
.stats-view__card > div { display: flex; flex-direction: column; gap: var(--space-xs, 4px); padding: var(--space-s, 8px); background: var(--color-surface, #fff); border-radius: var(--radius-s, 6px); }
.stats-view__card span { font-size: 0.8rem; opacity: 0.6; }
.stats-view__history { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.stats-view__match { display: flex; align-items: center; gap: var(--space-s, 8px); }
.stats-view__title { flex: 1; }
.stats-view__score { font-variant-numeric: tabular-nums; }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/views/PersonalStatsView.spec.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/views/PersonalStatsView.vue src/views/PersonalStatsView.spec.js
git commit -m "feat(p8): PersonalStatsView — aggregate stats + match history"
```

---

### Task 4: Routes + nav link + final build

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/layouts/AppLayout.vue`

**Interfaces:**
- Adds `/leaderboard` (LeaderboardView, requiresAuth) + `/stats` (PersonalStatsView, requiresAuth) routes.
- Adds a `Leaderboard` nav link in `AppLayout.vue` (between Network and Profile).

- [ ] **Step 1: Add routes**

In `src/router/index.js`, add after the `network` route:

```js
    { path: '/leaderboard', name: 'leaderboard', component: () => import('../views/LeaderboardView.vue'), meta: { requiresAuth: true } },
    { path: '/stats', name: 'stats', component: () => import('../views/PersonalStatsView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 2: Add the nav link**

In `src/layouts/AppLayout.vue`, add after the Network link:

```vue
        <router-link to="/leaderboard">Leaderboard</router-link>
```

- [ ] **Step 3: Run the full suite**

Run: `npm test 2>&1 | tail -8`
Expected: all tests PASS (142 prior + new Phase 8 tests).

- [ ] **Step 4: Run the build**

Run: `npm run build 2>&1 | tail -6`
Expected: build succeeds, PWA precache entry count increases (new views + html-to-image chunk).

- [ ] **Step 5: Commit**

```bash
git add src/router/index.js src/layouts/AppLayout.vue
git commit -m "feat(p8): leaderboard + stats routes and nav link"
```

---

## Deferred (out of scope for Phase 8 V1)

- Per-club / per-competition leaderboards — `getLeaderboard` is global; a `club_leaderboard(p_club_id)` RPC (join player_ratings + profiles + club_members) or a client-side intersect is the upgrade.
- Seasonal + all-time leaderboard toggles (Phase 9 lists seasonal/all-time).
- Confetti / glow-pulse reveal animation on the podium (spec §1B–1D motion language) — the podium is styled (gold/silver/bronze, elevated #1) but the Lithium celebratory motion is deferred.
- Reliability score breakdown (attendance-based) — `reliability_pct` is read as-is from `player_ratings`; the Phase 4b reliability computation feeds it.
- Head-to-head rivalry stats + MVP voting (Phase 9).
- CSV/JSON export (PNG only for V1).
