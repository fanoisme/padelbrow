# UI/UX Rework — Phase 5: Gamification & Stats + Final QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the final 4 views (`AchievementsView`, `ChallengesView`, `LeaderboardView`, `PersonalStatsView`) — the two views that had almost zero design-system adoption before this rework — and close out the entire 5-phase project with a cross-cutting verification pass across every restyled view.

**Architecture:** Same independent-per-view approach as Phases 1-4 for Tasks 1-4. `AchievementsView`/`ChallengesView` swap their hand-rolled XP/progress `<div>` bars for `LiProgress`, per the original design spec's explicit instruction. `LeaderboardView`'s PNG-export mechanism (`html-to-image`'s `toPng()` on a template ref) requires the ref to stay on a **plain HTML element**, never a component instance — this is preserved exactly. Task 5 is different in kind from Tasks 1-4: it's a manual/agent-driven verification pass with no code diff, so it is executed directly (not dispatched through the implementer/reviewer subagent loop that Tasks 1-4 use).

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, the Lithium design-system (`src/design-system/components/`), plain CSS custom properties.

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-14-ui-ux-consistency-rework-design.md`. Tasks 1-4 implement §3 (per-view-type restyle pattern, specifically the "Gamification" and "Stats/Leaderboard" bullets). Task 5 implements the spec's §6 Execution Shape final-pass requirement (375px/768px/1280px check + dark-mode toggle + full nav click-through) for the **entire project**, not just this phase.
- **No business-logic changes.** Every composable call (`useGamification`, `useStats`, `useAuth`) keeps identical function names, arguments, and call sites.
- **`LeaderboardView`'s PNG export must keep working exactly as today.** `standingsRef` must stay bound to a plain `<div>`, never to a component (e.g. `<LiGlassCard ref="standingsRef">`) — `html-to-image`'s `toPng()` needs a real `HTMLElement`, and none of the `Li*` components expose their root element via `defineExpose`, so binding a template ref to a component would silently break the export (the ref would resolve to a component proxy, not a DOM node). Components may be nested *inside* the ref'd div freely — only the ref target itself must stay a plain element.
- **Fix a pre-existing bug while touching `PersonalStatsView`:** the file currently passes `variant="danger"` to `LiBadge` for the loss badge, but `LiBadge`'s prop validator only allows `['neutral', 'success', 'info', 'warning', 'error', 'brand']` — `'danger'` is invalid and produces a Vue prop-validation warning on every test run (confirmed present in this repo's baseline test output since before this rework began). Task 4 changes this to the valid `variant="error"` while restyling — a one-word fix, not a scope-creep concern, since Vue warnings are exactly the kind of test-output noise this project's quality bar treats as a finding.
- **Fix a second pre-existing bug while touching `PersonalStatsView`:** `.stats-view__card`'s grid is hardcoded `grid-template-columns: repeat(3, 1fr)`, which does not collapse on mobile — one of the few genuinely non-responsive grids left in the app, and directly in scope of this project's mobile-native requirement (design spec §4: multi-column grids collapse on narrow screens). Task 4 changes this to `repeat(auto-fit, minmax(120px, 1fr))`, consistent with the auto-fill/auto-fit pattern already used by every list-grid restyled in Phases 2-4.
- **`LeaderboardView`'s "current user" row highlight uses a real token.** The existing `.leaderboard-view__row--me` rule references `var(--color-brand-50, #eef)` — `--color-brand-50` is not a token defined anywhere in `tokens.css`, so this rule has always silently fallen back to the literal `#eef` hardcoded hex. Task 3 replaces it with the real semantic token `--color-warning-container` (a soft yellow highlight, consistent with the brand's warm palette), removing a phantom-variable/hardcoded-color violation while touching this file anyway.
- **Preserve every existing spec assertion exactly.** All 4 restyle tasks in this phase need **zero** spec-file changes — pure restyles, no new nav/dialog behavior.
- **Breakpoint convention:** literal `480px`/`768px`/`1024px` only — no new `@media` rules needed in Tasks 1-4 (grids already use `auto-fill`/`auto-fit`, `LiPageHeader`'s built-in `flex-wrap` handles header rows).
- **No new npm dependencies, no new design-system components.** `LiProgress`, `LiCountUp`, `LiCard`, `LiListTile`, `LiPageHeader`, `LiRevealOnScroll`, `LiEmptyState` already exist from earlier phases.
- **Dark mode:** only semantic tokens, no new hardcoded hex colors.

## File Structure

- Modify: `src/views/AchievementsView.vue` (LiPageHeader + LiProgress + LiCountUp + LiCard achievement grid)
- Modify: `src/views/ChallengesView.vue` (LiPageHeader + LiProgress + LiCard challenge list)
- Modify: `src/views/LeaderboardView.vue` (LiPageHeader + LiCard/LiListTile ranked rows — PNG-export ref untouched)
- Modify: `src/views/PersonalStatsView.vue` (LiPageHeader + LiCard stat tiles + LiCard/LiListTile match history, plus the two pre-existing bug fixes above)
- No file changes for Task 5 (verification pass only)

---

### Task 1: AchievementsView — LiPageHeader + LiProgress + LiCountUp

**Files:**
- Modify: `src/views/AchievementsView.vue` (full file)
- Test: `src/views/AchievementsView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiProgress`, `LiCountUp`, `LiCard`, `LiRevealOnScroll` (existing).

**Preserve exactly:** `getMyProgress` called with `'u1'`; `wrapper.text()` contains `'Amateur'` (level title) and `'First Match'` (achievement name); `wrapper.findAll('[data-testid="achievement-card"]')` returns elements where the first has class `achievement-card--unlocked` and the second does not — **the `data-testid` attribute and the conditional class must land on the same rendered element**, which works via Vue's default attribute/class fallthrough onto a component's single root element (the same mechanism already relied on throughout Phases 2-4, e.g. `<LiCard class="clubs-view__card">`).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/AchievementsView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/AchievementsView.vue` in full**

```vue
<template>
  <section class="achievements-view">
    <LiPageHeader v-if="progress" :title="`Level ${progress.level.level} — ${progress.level.title}`">
      <template #actions>
        <span class="achievements-view__xp"><LiCountUp :end-val="progress.totalXp" />&nbsp;XP</span>
      </template>
    </LiPageHeader>

    <div v-if="progress" class="achievements-view__head">
      <LiProgress :value="barPct" variant="brand" />
      <p v-if="progress.nextLevel" class="achievements-view__next">
        {{ progress.nextMinXp - progress.totalXp }} XP to {{ progress.nextLevel.title }}
      </p>
      <p v-else class="achievements-view__next">Max level reached</p>
    </div>

    <LiRevealOnScroll variant="fade-up" stagger>
      <div class="achievements-view__grid">
        <LiCard
          v-for="a in achievements"
          :key="a.id"
          data-testid="achievement-card"
          class="achievement-card"
          :class="{ 'achievement-card--unlocked': unlocked.has(a.id) }"
        >
          <LiBadge :label="a.tier" :variant="tierVariant(a.tier)" />
          <strong>{{ a.name }}</strong>
          <p>{{ a.description }}</p>
          <span v-if="unlocked.has(a.id)" class="achievement-card__state">Unlocked</span>
          <span v-else class="achievement-card__state achievement-card__state--locked">Locked</span>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, LiCard, LiCountUp, LiPageHeader, LiProgress, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useGamification } from '../composables/useGamification.js'

const toast = useToast()
const { user } = useAuth()
const { getMyProgress, getAchievements, getMyUnlocked } = useGamification()

const progress = ref(null)
const achievements = ref([])
const unlocked = ref(new Set())

const barPct = computed(() => {
  if (!progress.value || !progress.value.nextMinXp) return 100
  const span = progress.value.nextMinXp - progress.value.level.min_xp
  const done = progress.value.totalXp - progress.value.level.min_xp
  return span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100
})

function tierVariant(tier) {
  if (tier === 'platinum') return 'info'
  if (tier === 'gold') return 'warning'
  if (tier === 'silver') return 'neutral'
  return 'brand'
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [p, a, u] = await Promise.all([
      getMyProgress(user.value.id),
      getAchievements(),
      getMyUnlocked(user.value.id),
    ])
    progress.value = p
    achievements.value = a
    unlocked.value = u
  } catch (err) {
    toast.error(err.message || 'Could not load achievements.')
  }
})
</script>

<style scoped>
.achievements-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.achievements-view__xp { font-weight: 700; font-size: 1.1rem; color: var(--color-on-surface, #333333); }
.achievements-view__head { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.achievements-view__next { font-size: 0.85rem; opacity: 0.7; }
.achievements-view__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-s, 8px); }
.achievement-card { display: flex; flex-direction: column; gap: var(--space-xs, 4px); opacity: 0.5; border: 2px solid transparent; }
.achievement-card--unlocked { opacity: 1; border-color: var(--color-brand, #FFAF03); box-shadow: var(--shadow-glow, 0 0 24px rgba(255, 188, 37, 0.25)); }
.achievement-card__state { font-size: 0.8rem; font-weight: 600; }
.achievement-card__state--locked { opacity: 0.5; }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/AchievementsView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/AchievementsView.vue
git commit -m "feat(ui-rework): restyle AchievementsView with LiProgress + LiCountUp"
```

---

### Task 2: ChallengesView — LiPageHeader + LiProgress + LiCard list

**Files:**
- Modify: `src/views/ChallengesView.vue` (full file)
- Test: `src/views/ChallengesView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiProgress`, `LiCard`, `LiEmptyState`, `LiRevealOnScroll` (existing).

**Preserve exactly:** `getActiveChallenges` called; `getPersonalHistory` called with `'u1'`; `wrapper.text()` contains `'Play 3 this week'` and `'2 / 3'` (the exact `{{ progressOf(c) }} / {{ targetOf(c) }}` interpolation — this text stays a plain `<span>`, separate from the new `LiProgress` bar, which shows the same ratio visually but doesn't replace this text).

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/ChallengesView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/ChallengesView.vue` in full**

```vue
<template>
  <section class="challenges-view">
    <LiPageHeader title="Challenges" subtitle="Complete active challenges to earn bonus XP." />

    <LiEmptyState v-if="!challenges.length" title="No active challenges." icon="target" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="challenges-view__list">
        <LiCard v-for="c in challenges" :key="c.id" class="challenge-card">
          <div class="challenge-card__head">
            <strong>{{ c.title }}</strong>
            <LiBadge :label="c.period" variant="info" />
            <span class="challenge-card__reward">+{{ c.xp_reward }} XP</span>
          </div>
          <p>{{ c.description }}</p>
          <LiProgress :value="pctOf(c)" variant="brand" />
          <span class="challenge-card__progress">{{ progressOf(c) }} / {{ targetOf(c) }}</span>
        </LiCard>
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiBadge, LiCard, LiEmptyState, LiPageHeader, LiProgress, LiRevealOnScroll, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useGamification } from '../composables/useGamification.js'
import { useStats } from '../composables/useStats.js'

const toast = useToast()
const { user } = useAuth()
const { getActiveChallenges } = useGamification()
const { getPersonalHistory } = useStats()

const challenges = ref([])
const history = ref([])

function inWindow(c, createdAt) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return t >= new Date(c.starts_at).getTime() && t <= new Date(c.ends_at).getTime()
}
function wonMatch(h) {
  if (!h.match || h.match.score_a == null || h.match.score_b == null) return false
  return h.team === 'a' ? h.match.score_a > h.match.score_b : h.match.score_b > h.match.score_a
}
function targetOf(c) {
  return Number(c.target_criteria?.count) || 0
}
function progressOf(c) {
  const type = c.target_criteria?.type
  return history.value.filter((h) =>
    h.match?.status === 'completed' &&
    inWindow(c, h.match.created_at) &&
    (type === 'meet_won' ? wonMatch(h) : true),
  ).length
}
function pctOf(c) {
  const t = targetOf(c)
  return t > 0 ? Math.min(100, Math.round((progressOf(c) / t) * 100)) : 0
}

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const [c, h] = await Promise.all([getActiveChallenges(), getPersonalHistory(user.value.id)])
    challenges.value = c
    history.value = h
  } catch (err) {
    toast.error(err.message || 'Could not load challenges.')
  }
})
</script>

<style scoped>
.challenges-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.challenges-view__list { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.challenge-card { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.challenge-card__head { display: flex; align-items: center; gap: var(--space-s, 8px); }
.challenge-card__reward { margin-left: auto; font-weight: 600; }
.challenge-card__progress { font-size: 0.85rem; opacity: 0.7; }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/ChallengesView.spec.js`
Expected: PASS (1 test), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/ChallengesView.vue
git commit -m "feat(ui-rework): restyle ChallengesView with LiProgress + LiCard"
```

---

### Task 3: LeaderboardView — LiPageHeader + LiCard/LiListTile ranked rows

**Files:**
- Modify: `src/views/LeaderboardView.vue` (full file)
- Test: `src/views/LeaderboardView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile` (existing). `Podium` (existing child component, untouched).

**Preserve exactly:** `getLeaderboard` called on mount; `wrapper.text()` contains `'Me'` (top-3, rendered by the untouched `Podium` component) and `'C'` (4th place, rendered in the restyled ranked-row list); `wrapper.find('[data-testid="export-png"]')` exists and calls `toPng` on click. **`standingsRef` must remain bound to a plain `<div>`** — do not move it onto any component.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/LeaderboardView.spec.js`
Expected: PASS (2 tests)

- [ ] **Step 2: Replace `src/views/LeaderboardView.vue` in full**

```vue
<template>
  <section class="leaderboard-view">
    <LiPageHeader title="Leaderboard" subtitle="Global rankings across every match played.">
      <template #actions>
        <LiButton data-testid="export-png" :loading="exporting" @click="handleExport">Export PNG</LiButton>
      </template>
    </LiPageHeader>

    <div ref="standingsRef" class="leaderboard-view__standings">
      <Podium v-if="rows.length >= 3" :players="rows.slice(0, 3)" />
      <LiCard flush>
        <LiListTile
          v-for="(r, i) in rows.slice(3)"
          :key="r.user_id"
          :title="r.user?.full_name"
          :subtitle="`${r.matches_played} played`"
          class="leaderboard-view__row"
          :class="{ 'leaderboard-view__row--me': r.user_id === user?.id }"
        >
          <template #leading>
            <span class="leaderboard-view__rank">{{ i + 4 }}</span>
          </template>
          <template #trailing>
            <span class="leaderboard-view__rating">{{ Number(r.rating).toFixed(1) }}</span>
          </template>
        </LiListTile>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
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
.leaderboard-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.leaderboard-view__standings { display: flex; flex-direction: column; gap: var(--space-m, 16px); background: var(--color-surface, #fff); padding: var(--space-m, 16px); border-radius: var(--radius-lg, 24px); }
.leaderboard-view__row--me { background: var(--color-warning-container, #FFF3D6); font-weight: 600; }
.leaderboard-view__rank { opacity: 0.6; font-weight: 700; min-width: 24px; text-align: center; }
.leaderboard-view__rating { font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/LeaderboardView.spec.js`
Expected: PASS (2 tests), output pristine.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/LeaderboardView.vue
git commit -m "feat(ui-rework): restyle LeaderboardView with LiPageHeader + LiListTile rows"
```

---

### Task 4: PersonalStatsView — LiPageHeader + LiCard stat tiles + LiCard/LiListTile history

**Files:**
- Modify: `src/views/PersonalStatsView.vue` (full file)
- Test: `src/views/PersonalStatsView.spec.js` (no changes — verify unmodified)

**Interfaces:**
- Consumes: `LiPageHeader`, `LiCard`, `LiListTile`, `LiEmptyState` (existing).

**Preserve exactly:** `getPersonalStats` called with `'u1'`; `getPersonalHistory` called with `'u1'`; `wrapper.text()` contains `'Tue Night'` (meet title) and `'21-15'` (score, exact `${score_a}-${score_b}` format, no spaces).

**Bug fixes bundled into this restyle (see Global Constraints):** `LiBadge`'s invalid `variant="danger"` → `variant="error"`; the stat-tile grid's hardcoded `repeat(3, 1fr)` → `repeat(auto-fit, minmax(120px, 1fr))` for mobile responsiveness.

- [ ] **Step 1: Run the existing spec to confirm the current baseline is green**

Run: `npx vitest run src/views/PersonalStatsView.spec.js`
Expected: PASS (1 test)

- [ ] **Step 2: Replace `src/views/PersonalStatsView.vue` in full**

```vue
<template>
  <section class="stats-view">
    <LiPageHeader title="My stats" subtitle="Your rating, reliability, and match history." />

    <div v-if="stats" class="stats-view__card">
      <LiCard class="stats-view__tile"><span>Rating</span><strong>{{ Number(stats.rating).toFixed(1) }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Played</span><strong>{{ stats.matches_played }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Reliability</span><strong>{{ Math.round(stats.reliability_pct) }}%</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Wins</span><strong>{{ wins }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Losses</span><strong>{{ losses }}</strong></LiCard>
      <LiCard class="stats-view__tile"><span>Win %</span><strong>{{ winPct }}%</strong></LiCard>
    </div>

    <h2>Match history</h2>
    <LiEmptyState v-if="!history.length" title="No matches yet." icon="history" />
    <LiCard v-else flush>
      <LiListTile
        v-for="h in history"
        :key="h.match.id"
        :title="h.match.meet?.title || 'Match'"
        :subtitle="`${h.match.score_a}-${h.match.score_b}`"
      >
        <template #trailing>
          <LiBadge v-if="h.match.status === 'completed'" :label="resultOf(h) ? 'W' : 'L'" :variant="resultOf(h) ? 'success' : 'error'" />
          <LiBadge v-else label="pending" variant="neutral" />
        </template>
      </LiListTile>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiBadge, LiCard, LiEmptyState, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
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
.stats-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.stats-view__card { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-s, 8px); }
.stats-view__tile { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.stats-view__tile span { font-size: 0.8rem; opacity: 0.6; }
</style>
```

- [ ] **Step 3: Run the spec again to confirm it's still green**

Run: `npx vitest run src/views/PersonalStatsView.spec.js`
Expected: PASS (1 test), output pristine — this run should no longer show the `Invalid prop: custom validator check failed for prop "variant"` warning that appeared in the baseline.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/PersonalStatsView.vue
git commit -m "feat(ui-rework): restyle PersonalStatsView + fix invalid LiBadge variant + responsive stat grid"
```

---

### Task 5: Final project-wide verification pass

**This task is executed directly by the controller, not dispatched to an implementer/reviewer subagent pair** — it's a manual/agent-driven verification activity with no code diff to review, unlike Tasks 1-4. Use it as a checklist after Task 4's review is approved.

**Files:** none (verification only, no code changes expected — if a real bug is found, it becomes its own small fix task using the normal implement → test → review loop, not folded silently into this checklist).

- [ ] **Step 1: Start the dev server**

Use the project's dev server (`npm run dev`, or the `run` skill / Browser tool's `preview_start`) and confirm it boots without errors.

- [ ] **Step 2: Desktop pass (1280px)**

Visit each of these routes and confirm no console errors and that the restyled `LiPageHeader`/`LiCard`/`LiListTile` markup renders as expected: `/`, `/login`, `/signup`, `/feed`, `/clubs`, `/clubs/:id` (any real club id), `/network`, `/profile`, `/meets`, `/meets/:id`, `/meets/new`, `/competitions`, `/competitions/:id`, `/competitions/new`, `/leaderboard`, `/stats`, `/achievements`, `/challenges`.

- [ ] **Step 3: Mobile pass (375px)**

Resize to 375px width and confirm: the bottom tab bar (Feed/Meets/Clubs/Leaderboard/More) is visible and the desktop pill nav is hidden; the "More" sheet opens and its `/stats`, `/challenges`, `/competitions`, `/network`, `/achievements`, `/profile` links all work; `ClubsView`'s create-club dialog renders as a bottom sheet (not a centered modal); no layout overflow/clipping on any of the routes from Step 2, with particular attention to `MatchSessionView`'s round list (team names must wrap, not truncate) and `CompetitionDetailView`'s round list (same).

- [ ] **Step 4: Tablet pass (768px)**

Resize to 768px (the nav-collapse breakpoint) and confirm the transition between desktop pill nav and mobile bottom tab bar happens cleanly at this exact width, with no double-nav or no-nav gap.

- [ ] **Step 5: Dark mode spot-check**

This app has no dark-mode toggle UI yet (`tokens.css`'s `[data-theme="dark"]` block exists, but nothing in the app sets that attribute). Using the browser console, run `document.documentElement.setAttribute('data-theme', 'dark')` on 2-3 representative pages (e.g. `/`, `/achievements`, `/leaderboard`) and confirm text stays legible (no dark-text-on-dark-background or invisible elements) — this exercises the same semantic tokens every restyled view has been using throughout Phases 1-5. Then remove the attribute (`document.documentElement.removeAttribute('data-theme')`) to leave the app in its default light state.

- [ ] **Step 6: Report findings**

Summarize what was checked and any issues found. If a real bug is found (not a pre-existing, already-documented one like the missing dark-mode toggle UI or the `LiCard flush` partial-padding quirk from Phase 3/4), stop and treat it as its own fix task with the normal test-and-review cycle — do not silently patch it as part of this checklist.

---

## Self-Review

**1. Spec coverage:** §3's Gamification and Stats/Leaderboard restyle bullets are covered by Tasks 1-4. §6's final-pass verification requirement (375/768/1280px + dark mode + nav click-through) is covered by Task 5, scoped to the whole project since this is the last phase.

**2. Placeholder scan:** No TBD/TODO; every step in Tasks 1-4 has complete code. Task 5's steps are genuinely a checklist (not a placeholder) because verification work is inherently "go look and report," not code to transcribe — this is called out explicitly rather than papered over with fake code.

**3. Type consistency:** `LiPageHeader`, `LiCard`, `LiListTile`, `LiProgress` are used identically to how Phases 1-4 established their contracts. The `data-testid`+`class` fallthrough pattern in Task 1 matches the same mechanism already relied on since Phase 2's `ClubsView`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-ui-ux-rework-phase-5-gamification-stats-final-qa.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
