# PADEL BROW — Phase 6 (Competitions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build formal tournaments — create competition, team registration with seeding, bracket/round-robin generation the organizer triggers on registration close, score entry, and live standings — distinct from Phase 3's social meets.

**Architecture:** Pure, DB-free tournament generators live in `src/lib/tournamentGenerators.js` (round-robin circle method + seeded single-elim + standings) so the algorithm is unit-testable in isolation. Composables (`useCompetitions`, `useCompetitionRegistrations`, `useCompetitionMatches`) wrap Supabase queries against the Phase 1 schema (already migrated, RLS-correct — organizers are `club_members` with role owner/organizer). Views consume composables + the vendored `Li*` components. The lazy router from Phase 3 means new routes need no `router/index.spec.js` changes.

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router (hash mode, lazy routes), `@supabase/supabase-js`, Vitest + `@vue/test-utils`.

## Global Constraints

- Vue 3 Composition API with `<script setup>` for every component.
- All DB access through the shared `src/lib/supabase.js` `supabase` client; RLS is the real security boundary — don't re-implement authorization client-side (e.g. don't client-check "am I an organizer" before a call; let RLS surface a Postgres error).
- Never edit files under `src/design-system/` (the vendored Lithium library). If a test can't select what it needs through a `Li*` component's existing props/DOM, change the test's selector strategy (select by `placeholder`, wrap in a `<div data-testid>`, `findComponent`) — never add `inheritAttrs`/`$attrs` or any edit to a vendored component.
- Test mocks for `useAuth().user` MUST use a real Vue `ref()` (e.g. `ref({ id: 'u1' })`), never a plain `{ value: ... }` object.
- When mounting a component that renders `<router-link>`, stub it with a slot-forwarding component: `const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }` and pass `global: { stubs: { RouterLink: RouterLinkStub } }`.
- Authenticated mutation handlers MUST catch and surface errors via `useToast` (from `src/design-system/components/index.js`).
- **`v-model.number` is a no-op on `LiTextField`** (the vendored component has no `modelModifiers` prop) — so numeric form values arrive as strings. For numeric competition fields (`fee_amount`, `max_participants`), `Number()`-coerce in the submit handler before sending (a cleared field becomes `0`/`null` deliberately, never the empty-string that caused Phase 3's DB cast errors).
- Router stays in hash mode; route components stay lazy (`() => import(...)`).
- Migration application (none expected this phase — schema already exists — but if one is needed): `npx supabase migration new <name>` → `npx supabase db push` → `npx supabase migration list` confirms local==remote. Local Docker is NOT used.

**Deferred to a later phase** (out of scope for this plan): double-elimination + groups formats, "advance winners" auto-promotion through single-elim rounds beyond round 1→2 (the bracket SKELETON is generated; manual/semi-auto advancement is V1), public shareable read-only link + TV mode (reuses Phase 3's pattern but deferred), multi-day scheduling UI polish, payment-proof upload for competition fees (Phase 5). The `competition_matches` table's nullable `team_a_id`/`team_b_id` lets later rounds be represented as TBD placeholders now.

---

## File Structure

```
src/lib/
  tournamentGenerators.js     (PURE: generateRoundRobin, generateSingleElimination, bracketRoundName, computeStandings)
  tournamentGenerators.spec.js
src/composables/
  useCompetitions.js          (create/list/get competition; generateMatches — runs generator + persists)
  useCompetitionRegistrations.js (register team, list registrations, confirm + seed)
  useCompetitionMatches.js    (list by round, enterScore, advanceWinners [single-elim round1→2])
src/views/
  competitions/CreateCompetitionView.vue   (/competitions/new)
  competitions/CompetitionsListView.vue    (/competitions)
  competitions/CompetitionDetailView.vue   (/competitions/:id — Details/Teams/Standings-or-Bracket)
src/router/index.js           (modified: 3 lazy competition routes)
src/layouts/AppLayout.vue     (modified: Competitions nav link)
```

---

### Task 1: Tournament generators (pure functions)

**Files:**
- Create: `src/lib/tournamentGenerators.js`
- Test: `src/lib/tournamentGenerators.spec.js`

**Interfaces:**
- Produces (all pure, no Supabase):
  - `generateRoundRobin(teamIds: string[]): Match[]` — circle method; `teamIds` already in seed order. Returns every real pairing across N-1 rounds (N even) or N rounds (N odd, byes skipped — only both-sides-present matches returned). Each `Match = { round_name: string, bracket_position: number, team_a_id: string, team_b_id: string }`.
  - `generateSingleElimination(teamIds: string[]): Match[]` — seeded bracket. Round 1 has real teams + byes (bye side = `null`); later rounds are placeholder matches with both teams `null` (TBD), so the full bracket shape exists. `Match` extends to allow `team_a_id: string|null, team_b_id: string|null`. `bracket_position` encodes match index within its round; a match at `(round r, position p)` feeds into `(round r+1, position floor(p/2))`.
  - `bracketRoundName(roundIndex: number, totalRounds: number): string` — `totalRounds-1` = "Final", `-2` = "Semifinal", `-3` = "Quarterfinal", else `"Round of {size}"`.
  - `computeStandings(matches: Array<{team_a_id, team_b_id, score_a, score_b, status}>, teamIds: string[]): Standing[]` — from completed matches only; each `Standing = { team_id, played, won, lost, points_for, points_against }`, sorted by `[won desc, points_for - points_against desc]`.

- [ ] **Step 1: Write the failing tests**

`src/lib/tournamentGenerators.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import {
  generateRoundRobin,
  generateSingleElimination,
  bracketRoundName,
  computeStandings,
} from './tournamentGenerators.js'

describe('generateRoundRobin', () => {
  it('produces every pairing exactly once for an even team count', () => {
    const ids = ['A', 'B', 'C', 'D']
    const matches = generateRoundRobin(ids)
    // 4 teams → 6 unique pairings, across 3 rounds of 2 matches.
    const pairings = matches.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()
    expect(pairings).toEqual(['A-B', 'A-C', 'A-D', 'B-C', 'B-D', 'C-D'])
    expect(matches.every((m) => m.team_a_id && m.team_b_id)).toBe(true)
  })

  it('skips byes for an odd team count (no null-sided matches)', () => {
    const ids = ['A', 'B', 'C']
    const matches = generateRoundRobin(ids)
    // 3 teams → 3 real pairings (A-B, A-C, B-C); byes omitted.
    const pairings = matches.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()
    expect(pairings).toEqual(['A-B', 'A-C', 'B-C'])
    expect(matches.every((m) => m.team_a_id && m.team_b_id)).toBe(true)
  })

  it('assigns sequential bracket positions within each round', () => {
    const matches = generateRoundRobin(['A', 'B', 'C', 'D'])
    const rounds = {}
    for (const m of matches) {
      rounds[m.round_name] = rounds[m.round_name] || []
      rounds[m.round_name].push(m.bracket_position)
    }
    for (const name of Object.keys(rounds)) {
      const positions = rounds[name]
      expect(positions.sort((a, b) => a - b)).toEqual(positions.map((_, i) => i))
    }
  })
})

describe('generateSingleElimination', () => {
  it('seeds round 1 so 1 vs last and 2 vs 2nd-last, with byes to top seeds when not a power of 2', () => {
    // 6 teams, next pow2 = 8 → 2 byes (seeds 1 and 2 skip round 1).
    const ids = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
    const matches = generateSingleElimination(ids)
    const round1 = matches.filter((m) => m.round_name.includes('Round of 8') || /Round 1/.test(m.round_name))
    // The two real round-1 matches pair seeds 3v6 and 4v5 (1 and 2 bye).
    const realR1 = round1.filter((m) => m.team_a_id && m.team_b_id)
    const byes = round1.filter((m) => (m.team_a_id === null) !== (m.team_b_id === null))
    expect(realR1.length + byes.length).toBe(4) // 8 slots → 4 round-1 "matches"
    expect(byes.length).toBe(2)
    expect(realR1.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()).toEqual(['T3-T6', 'T4-T5'])
  })

  it('pairs 1 vs last directly when team count is a power of 2', () => {
    const ids = ['T1', 'T2', 'T3', 'T4']
    const matches = generateSingleElimination(ids)
    const round1 = matches.filter((m) => m.bracket_position < 2 && m.team_a_id && m.team_b_id)
    // Standard 4-slot bracket: 1v4 and 2v3
    expect(round1.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()).toEqual(['T1-T4', 'T2-T3'])
  })

  it('emits placeholder matches for later rounds with both teams null (TBD)', () => {
    const matches = generateSingleElimination(['T1', 'T2', 'T3', 'T4'])
    const final = matches.find((m) => m.round_name === 'Final')
    expect(final).toBeTruthy()
    expect(final.team_a_id).toBeNull()
    expect(final.team_b_id).toBeNull()
  })
})

describe('bracketRoundName', () => {
  it('names the last round Final, then Semifinal, Quarterfinal, else Round of N', () => {
    // totalRounds = 3 (4 teams): index 2 = Final, 1 = Semifinal, 0 = Round of 4
    expect(bracketRoundName(2, 3)).toBe('Final')
    expect(bracketRoundName(1, 3)).toBe('Semifinal')
    expect(bracketRoundName(0, 3)).toBe('Round of 4')
    // totalRounds = 4 (8 teams): index 0 = Round of 8
    expect(bracketRoundName(0, 4)).toBe('Round of 8')
    expect(bracketRoundName(3, 4)).toBe('Final')
  })
})

describe('computeStandings', () => {
  it('tallies won/lost/points from completed matches and sorts by wins then diff', () => {
    const matches = [
      { team_a_id: 'A', team_b_id: 'B', score_a: 6, score_b: 3, status: 'completed' },
      { team_a_id: 'A', team_b_id: 'C', score_a: 6, score_b: 4, status: 'completed' },
      { team_a_id: 'B', team_b_id: 'C', score_a: 2, score_b: 6, status: 'completed' },
      { team_a_id: 'A', team_b_id: 'B', score_a: null, score_b: null, status: 'pending' }, // ignored
    ]
    const standings = computeStandings(matches, ['A', 'B', 'C'])
    // A: 2W 0L pf12 pa7 ; C: 2W... wait C beat B so C 1W 1L; B 0W 2L
    expect(standings.map((s) => s.team_id)).toEqual(['A', 'C', 'B'])
    const a = standings.find((s) => s.team_id === 'A')
    expect(a).toMatchObject({ played: 2, won: 2, lost: 0, points_for: 12, points_against: 7 })
    const b = standings.find((s) => s.team_id === 'B')
    expect(b).toMatchObject({ played: 2, won: 0, lost: 2 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tournamentGenerators`
Expected: FAIL — `src/lib/tournamentGenerators.js` does not exist.

- [ ] **Step 3: Implement**

`src/lib/tournamentGenerators.js`:
```js
// Pure tournament generators — no Supabase, fully unit-testable.

// Round-robin via the circle method. teamIds already in seed order. Byes
// (introduced for odd counts) are skipped — only real pairings returned.
export function generateRoundRobin(teamIds) {
  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push(null) // bye marker
  const n = teams.length
  const roundCount = n - 1
  const matches = []
  const working = teams.slice() // index 0 fixed, rest rotate

  for (let r = 0; r < roundCount; r++) {
    let pos = 0
    for (let i = 0; i < n / 2; i++) {
      const a = working[i]
      const b = working[n - 1 - i]
      if (a !== null && b !== null) {
        matches.push({ round_name: `Round ${r + 1}`, bracket_position: pos, team_a_id: a, team_b_id: b })
        pos++
      }
    }
    // rotate: keep working[0], move the last of the rest to the front of the rest
    const fixed = working[0]
    const rest = working.slice(1)
    rest.unshift(rest.pop())
    working.splice(0, working.length, fixed, ...rest)
  }
  return matches
}

// Seeded single-elimination bracket. Returns the full bracket: round 1 has real
// teams + byes (bye side null); later rounds are placeholders (both null).
// bracket_position = match index within the round; (round r, pos p) feeds into
// (round r+1, floor(p/2)).
export function generateSingleElimination(teamIds) {
  const n = teamIds.length
  if (n < 2) return []
  const p = nextPow2(n)
  const totalRounds = Math.log2(p)
  const seeds = bracketSeedOrder(p) // length p, standard bracket slot order (1-indexed)

  // Map seeds to team ids (seed s → teamIds[s-1]); seeds beyond n are byes.
  const slotTeam = seeds.map((s) => (s <= n ? teamIds[s - 1] : null))

  const matches = []
  // Round 1: pair slotTeam[0]v[1], [2]v[3], ...
  for (let j = 0; j < p / 2; j++) {
    matches.push({
      round_name: bracketRoundName(0, totalRounds),
      bracket_position: j,
      team_a_id: slotTeam[2 * j],
      team_b_id: slotTeam[2 * j + 1],
    })
  }
  // Later rounds: placeholders, both teams TBD.
  let prevMatches = p / 2
  for (let r = 1; r < totalRounds; r++) {
    const thisMatches = prevMatches / 2
    for (let j = 0; j < thisMatches; j++) {
      matches.push({
        round_name: bracketRoundName(r, totalRounds),
        bracket_position: j,
        team_a_id: null,
        team_b_id: null,
      })
    }
    prevMatches = thisMatches
  }
  return matches
}

export function bracketRoundName(roundIndex, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIndex
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Quarterfinal'
  const teamsInRound = Math.pow(2, roundIndex + 1)
  return `Round of ${teamsInRound}`
}

export function computeStandings(matches, teamIds) {
  const table = new Map()
  for (const id of teamIds) {
    table.set(id, { team_id: id, played: 0, won: 0, lost: 0, points_for: 0, points_against: 0 })
  }
  for (const m of matches) {
    if (m.status !== 'completed') continue
    if (m.score_a == null || m.score_b == null) continue
    if (!m.team_a_id || !m.team_b_id) continue
    const a = table.get(m.team_a_id)
    const b = table.get(m.team_b_id)
    if (!a || !b) continue
    a.played++
    b.played++
    a.points_for += m.score_a
    a.points_against += m.score_b
    b.points_for += m.score_b
    b.points_against += m.score_a
    if (m.score_a > m.score_b) {
      a.won++
      b.lost++
    } else if (m.score_b > m.score_a) {
      b.won++
      a.lost++
    }
  }
  return [...table.values()].sort((x, y) => {
    if (y.won !== x.won) return y.won - x.won
    const diffY = y.points_for - y.points_against
    const diffX = x.points_for - x.points_against
    return diffY - diffX
  })
}

function nextPow2(x) {
  let p = 1
  while (p < x) p *= 2
  return p
}

// Standard bracket slot order for a power-of-2 bracket, 1-indexed seeds.
// For P=4 → [1,4,2,3]; P=8 → [1,8,4,5,2,7,3,6]. Recursively: fold each existing
// seed with (2*current+1 - seed).
function bracketSeedOrder(p) {
  let slots = [1]
  while (slots.length < p) {
    const total = slots.length * 2 + 1
    const mirrored = slots.map((s) => total - s)
    slots = slots.flatMap((s, i) => [s, mirrored[i]])
  }
  return slots
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tournamentGenerators`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tournamentGenerators.js src/lib/tournamentGenerators.spec.js
git commit -m "Add pure tournament generators: round-robin, single-elim, standings"
```

---

### Task 2: `useCompetitions` composable

**Files:**
- Create: `src/composables/useCompetitions.js`
- Test: `src/composables/useCompetitions.spec.js`

**Interfaces:**
- Produces: `useCompetitions(): { listCompetitions(): Promise<object[]>, getCompetition(id): Promise<object|null>, createCompetition(payload, creatorClubId): Promise<object>, openRegistration(id): Promise<object>, startCompetition(id): Promise<object>, generateMatches(competition, seededTeams): Promise<object[]> }`.
  - `createCompetition` inserts a `competitions` row (status `'draft'`) and returns it. `payload` includes `name, sport, format, registration_opens_at, registration_closes_at, starts_at, ends_at, max_participants, fee_amount`; the composable merges `club_id` from `creatorClubId` and `status: 'draft'`.
  - `openRegistration` / `startCompetition` set `status` to `'registration_open'` / `'in_progress'`.
  - `generateMatches(competition, seededTeams)` — `seededTeams` is an array of `{ id }` (competition_teams rows in seed order). Runs the right generator based on `competition.format` (`round_robin` or `single_elim`; other formats throw `"unsupported format"` for now), bulk-inserts the resulting matches into `competition_matches` with `competition_id`, then sets `status='in_progress'`, returns the inserted rows. For `single_elim`/`round_robin` only — `double_elim`/`groups` throw until a later phase.

- [ ] **Step 1: Write the failing test**

`src/composables/useCompetitions.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))
// Stub the pure generators so this test stays about the composable's DB wiring.
vi.mock('../lib/tournamentGenerators.js', () => ({
  generateRoundRobin: vi.fn(() => [{ round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2' }]),
  generateSingleElimination: vi.fn(() => [{ round_name: 'Final', bracket_position: 0, team_a_id: null, team_b_id: null }]),
}))

import { supabase } from '../lib/supabase.js'
import { generateRoundRobin, generateSingleElimination } from '../lib/tournamentGenerators.js'
import { useCompetitions } from './useCompetitions.js'

describe('useCompetitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listCompetitions orders by created_at desc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'co1', name: 'Cup' }], error: null })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listCompetitions } = useCompetitions()
    const result = await listCompetitions()

    expect(supabase.from).toHaveBeenCalledWith('competitions')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual([{ id: 'co1', name: 'Cup' }])
  })

  it('createCompetition merges club_id + status draft and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'co1', status: 'draft' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createCompetition } = useCompetitions()
    const result = await createCompetition({ name: 'Cup', format: 'round_robin' }, 'club1')

    expect(insert).toHaveBeenCalledWith({ name: 'Cup', format: 'round_robin', club_id: 'club1', status: 'draft' })
    expect(result).toEqual({ id: 'co1', status: 'draft' })
  })

  it('generateMatches runs round-robin for that format, persists, and starts the competition', async () => {
    const insertMatches = vi.fn().mockResolvedValue({ data: [{ id: 'cm1' }], error: null })
    const matchesTable = { insert: insertMatches }
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    const compTable = { update }
    supabase.from.mockImplementation((table) => (table === 'competition_matches' ? matchesTable : compTable))

    const { generateMatches } = useCompetitions()
    const result = await generateMatches({ id: 'co1', format: 'round_robin' }, [{ id: 't1' }, { id: 't2' }])

    expect(generateRoundRobin).toHaveBeenCalledWith(['t1', 't2'])
    expect(insertMatches).toHaveBeenCalledWith([
      { round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2', competition_id: 'co1' },
    ])
    expect(update).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(result).toEqual([{ id: 'cm1' }])
  })

  it('generateMatches throws for an unsupported format', async () => {
    const { generateMatches } = useCompetitions()
    await expect(generateMatches({ id: 'co1', format: 'groups' }, [])).rejects.toThrow(/unsupported format/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCompetitions`
Expected: FAIL — `src/composables/useCompetitions.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useCompetitions.js`:
```js
import { supabase } from '../lib/supabase.js'
import { generateRoundRobin, generateSingleElimination } from '../lib/tournamentGenerators.js'

export function useCompetitions() {
  async function listCompetitions() {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function getCompetition(id) {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function createCompetition(payload, clubId) {
    const { data, error } = await supabase
      .from('competitions')
      .insert({ ...payload, club_id: clubId, status: 'draft' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function setStatus(id, status) {
    const { data, error } = await supabase
      .from('competitions')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function openRegistration(id) {
    return setStatus(id, 'registration_open')
  }

  async function startCompetition(id) {
    return setStatus(id, 'in_progress')
  }

  async function generateMatches(competition, seededTeams) {
    const teamIds = seededTeams.map((t) => t.id)
    let generated
    if (competition.format === 'round_robin') {
      generated = generateRoundRobin(teamIds)
    } else if (competition.format === 'single_elim') {
      generated = generateSingleElimination(teamIds)
    } else {
      throw new Error(`unsupported format: ${competition.format}`)
    }

    const rows = generated.map((m) => ({
      competition_id: competition.id,
      round_name: m.round_name,
      bracket_position: m.bracket_position,
      team_a_id: m.team_a_id,
      team_b_id: m.team_b_id,
    }))
    const { data, error } = await supabase.from('competition_matches').insert(rows).select()
    if (error) throw error

    await setStatus(competition.id, 'in_progress')
    return data
  }

  return { listCompetitions, getCompetition, createCompetition, openRegistration, startCompetition, generateMatches }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useCompetitions`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useCompetitions.js src/composables/useCompetitions.spec.js
git commit -m "Add useCompetitions composable: list, get, create, status transitions, generateMatches"
```

---

### Task 3: `useCompetitionRegistrations` composable

**Files:**
- Create: `src/composables/useCompetitionRegistrations.js`
- Test: `src/composables/useCompetitionRegistrations.spec.js`

**Interfaces:**
- Produces: `useCompetitionRegistrations(): { listRegistrations(competitionId): Promise<object[]>, registerTeam(competitionId, { name, playerIds }): Promise<object>, confirmRegistration(competitionId, teamId, seed): Promise<object> }`.
  - `registerTeam` inserts a `competition_teams` row (name + `player_ids`), then inserts a `competition_registrations` row with `status: 'pending'`, returning the team row. (Two sequential inserts — team first, then registration keyed off the returned team id.)
  - `confirmRegistration` updates the registration's `seed` and `status='confirmed'`.
  - `listRegistrations` returns registrations joined with their team (`competition_teams(id, name, player_ids)`).

- [ ] **Step 1: Write the failing test**

`src/composables/useCompetitionRegistrations.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useCompetitionRegistrations } from './useCompetitionRegistrations.js'

describe('useCompetitionRegistrations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listRegistrations returns registrations joined with team info', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ team_id: 't1', status: 'confirmed', seed: 1, competition_teams: { id: 't1', name: 'Eagles' } }],
      error: null,
    })
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listRegistrations } = useCompetitionRegistrations()
    const result = await listRegistrations('co1')

    expect(supabase.from).toHaveBeenCalledWith('competition_registrations')
    expect(eq).toHaveBeenCalledWith('competition_id', 'co1')
    expect(result[0].competition_teams.name).toBe('Eagles')
  })

  it('registerTeam inserts the team then a pending registration keyed off the returned team id', async () => {
    const teamSingle = vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Eagles' }, error: null })
    const teamSelect = vi.fn(() => ({ single: teamSingle }))
    const teamInsert = vi.fn(() => ({ select: teamSelect }))

    const regEq = vi.fn().mockResolvedValue({ error: null })
    const regInsert = vi.fn(() => ({ eq: regEq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'competition_teams') return { insert: teamInsert }
      if (table === 'competition_registrations') return { insert: regInsert }
      throw new Error(`unexpected table ${table}`)
    })

    const { registerTeam } = useCompetitionRegistrations()
    const result = await registerTeam('co1', { name: 'Eagles', playerIds: ['u1', 'u2'] })

    expect(teamInsert).toHaveBeenCalledWith({ competition_id: 'co1', name: 'Eagles', player_ids: ['u1', 'u2'] })
    expect(regInsert).toHaveBeenCalledWith({ competition_id: 'co1', team_id: 't1', status: 'pending' })
    expect(result).toEqual({ id: 't1', name: 'Eagles' })
  })

  it('confirmRegistration sets seed + confirmed status', async () => {
    const single = vi.fn().mockResolvedValue({ data: { team_id: 't1', status: 'confirmed', seed: 2 }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq2 = vi.fn(() => ({ select }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const update = vi.fn(() => ({ eq: eq1 }))
    supabase.from.mockReturnValue({ update })

    const { confirmRegistration } = useCompetitionRegistrations()
    const result = await confirmRegistration('co1', 't1', 2)

    expect(update).toHaveBeenCalledWith({ seed: 2, status: 'confirmed' })
    expect(eq1).toHaveBeenCalledWith('competition_id', 'co1')
    expect(eq2).toHaveBeenCalledWith('team_id', 't1')
    expect(result).toEqual({ team_id: 't1', status: 'confirmed', seed: 2 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCompetitionRegistrations`
Expected: FAIL — `src/composables/useCompetitionRegistrations.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useCompetitionRegistrations.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useCompetitionRegistrations() {
  async function listRegistrations(competitionId) {
    const { data, error } = await supabase
      .from('competition_registrations')
      .select('team_id, status, seed, competition_teams(id, name, player_ids)')
      .eq('competition_id', competitionId)
    if (error) throw error
    return data
  }

  async function registerTeam(competitionId, { name, playerIds }) {
    const { data: team, error: teamErr } = await supabase
      .from('competition_teams')
      .insert({ competition_id: competitionId, name, player_ids: playerIds })
      .select()
      .single()
    if (teamErr) throw teamErr

    const { error: regErr } = await supabase
      .from('competition_registrations')
      .insert({ competition_id: competitionId, team_id: team.id, status: 'pending' })
    if (regErr) throw regErr

    return team
  }

  async function confirmRegistration(competitionId, teamId, seed) {
    const { data, error } = await supabase
      .from('competition_registrations')
      .update({ seed, status: 'confirmed' })
      .eq('competition_id', competitionId)
      .eq('team_id', teamId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { listRegistrations, registerTeam, confirmRegistration }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useCompetitionRegistrations`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useCompetitionRegistrations.js src/composables/useCompetitionRegistrations.spec.js
git commit -m "Add useCompetitionRegistrations composable: list, registerTeam, confirm + seed"
```

---

### Task 4: `useCompetitionMatches` composable

**Files:**
- Create: `src/composables/useCompetitionMatches.js`
- Test: `src/composables/useCompetitionMatches.spec.js`

**Interfaces:**
- Produces: `useCompetitionMatches(): { listMatches(competitionId): Promise<object[]>, enterScore(matchId, scoreA, scoreB): Promise<object>, computeStandingsFor(matches, teamIds): Standing[] }`.
  - `enterScore` sets `score_a`, `score_b`, `status='completed'` on a `competition_matches` row.
  - `computeStandingsFor` delegates to the pure `computeStandings` (re-exported here for the view's convenience — round-robin standings are derived client-side from the loaded matches).

- [ ] **Step 1: Write the failing test**

`src/composables/useCompetitionMatches.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../lib/tournamentGenerators.js', () => ({
  computeStandings: vi.fn(() => [{ team_id: 't1', won: 1 }]),
}))

import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/tournamentGenerators.js'
import { useCompetitionMatches } from './useCompetitionMatches.js'

describe('useCompetitionMatches', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listMatches orders by round then bracket position', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'cm1', round_name: 'Round 1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listMatches } = useCompetitionMatches()
    const result = await listMatches('co1')

    expect(supabase.from).toHaveBeenCalledWith('competition_matches')
    expect(eq).toHaveBeenCalledWith('competition_id', 'co1')
    expect(order).toHaveBeenCalledWith([{ column: 'round_name' }, { column: 'bracket_position' }])
    expect(result).toEqual([{ id: 'cm1', round_name: 'Round 1' }])
  })

  it('enterScore sets scores + completed status', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'cm1', status: 'completed' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { enterScore } = useCompetitionMatches()
    const result = await enterScore('cm1', 6, 3)

    expect(update).toHaveBeenCalledWith({ score_a: 6, score_b: 3, status: 'completed' })
    expect(eq).toHaveBeenCalledWith('id', 'cm1')
    expect(result).toEqual({ id: 'cm1', status: 'completed' })
  })

  it('computeStandingsFor delegates to the pure computeStandings', () => {
    const { computeStandingsFor } = useCompetitionMatches()
    const result = computeStandingsFor([{ status: 'completed' }], ['t1'])
    expect(computeStandings).toHaveBeenCalled()
    expect(result).toEqual([{ team_id: 't1', won: 1 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCompetitionMatches`
Expected: FAIL — `src/composables/useCompetitionMatches.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useCompetitionMatches.js`:
```js
import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/tournamentGenerators.js'

export function useCompetitionMatches() {
  async function listMatches(competitionId) {
    const { data, error } = await supabase
      .from('competition_matches')
      .select('*')
      .eq('competition_id', competitionId)
      .order([{ column: 'round_name' }, { column: 'bracket_position' }])
    if (error) throw error
    return data
  }

  async function enterScore(matchId, scoreA, scoreB) {
    const { data, error } = await supabase
      .from('competition_matches')
      .update({ score_a: scoreA, score_b: scoreB, status: 'completed' })
      .eq('id', matchId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  function computeStandingsFor(matches, teamIds) {
    return computeStandings(matches, teamIds)
  }

  return { listMatches, enterScore, computeStandingsFor }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useCompetitionMatches`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useCompetitionMatches.js src/composables/useCompetitionMatches.spec.js
git commit -m "Add useCompetitionMatches composable: list (ordered), enterScore, standings"
```

---

### Task 5: Create Competition view + route + nav

**Files:**
- Create: `src/views/competitions/CreateCompetitionView.vue`
- Create: `src/views/competitions/CreateCompetitionView.spec.js`
- Modify: `src/router/index.js` (add `/competitions/new` lazy route)
- Modify: `src/layouts/AppLayout.vue` (add Competitions nav link)

**Interfaces:**
- Consumes: `useAuth().user`, `useClubs().listClubs` (Phase 2), `useCompetitions().createCompetition` (Task 2). On success redirects to `/competitions/:id`.
- Produces: route `competition-new` at `/competitions/new`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/competitions/CreateCompetitionView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow' }])
vi.mock('../../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs })),
}))

const createCompetition = vi.fn().mockResolvedValue({ id: 'co-new', name: 'Cup' })
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ createCompetition })),
}))

import CreateCompetitionView from './CreateCompetitionView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CreateCompetitionView', () => {
  it('renders the form and loads clubs on mount', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/competitions/new', name: 'competition-new', component: CreateCompetitionView },
        { path: '/competitions/:id', name: 'competition-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/competitions/new')
    await router.isReady()
    const wrapper = mount(CreateCompetitionView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    expect(listClubs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Create competition')
    expect(wrapper.text()).toContain('Padel Brow')
  })

  it('Number()-coerces numeric fields and calls createCompetition on submit', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/competitions/new', name: 'competition-new', component: CreateCompetitionView },
        { path: '/competitions/:id', name: 'competition-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/competitions/new')
    await router.isReady()
    const wrapper = mount(CreateCompetitionView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().match(/create competition/i))
    expect(btn).toBeTruthy()
    await btn.trigger('click')
    await flushPromises()

    expect(createCompetition).toHaveBeenCalled()
    const payload = createCompetition.mock.calls[0][0]
    // Numeric fields are coerced to actual numbers (not strings).
    expect(typeof payload.fee_amount).toBe('number')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CreateCompetitionView`
Expected: FAIL — `CreateCompetitionView.vue` does not exist.

- [ ] **Step 3: Implement `CreateCompetitionView.vue`**

```vue
<template>
  <section class="create-comp-view">
    <h1>Create competition</h1>
    <LiCard class="create-comp-view__card">
      <form @submit.prevent="handleSubmit">
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
        <LiButton type="submit" :loading="submitting">Create competition</LiButton>
      </form>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiCard, LiButton, LiTextField, LiSelect, useToast } from '../../design-system/components/index.js'
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

form {
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

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add (after the `meet-detail` route, before the catch-all):
```js
    { path: '/competitions/new', name: 'competition-new', component: () => import('../views/competitions/CreateCompetitionView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 5: Add the Competitions nav link**

In `src/layouts/AppLayout.vue`, inside the logged-in `<nav class="app-header__nav">`, add before the Meets link:
```html
        <router-link to="/competitions">Competitions</router-link>
```

- [ ] **Step 6: Run tests + build, verify pass**

Run: `npm test`
Expected: PASS — full suite green.
Run: `npm run build`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/views/competitions/CreateCompetitionView.vue src/views/competitions/CreateCompetitionView.spec.js src/router/index.js src/layouts/AppLayout.vue
git commit -m "Add Create Competition view, /competitions/new route, Competitions nav link"
```

---

### Task 6: Competitions list view + route

**Files:**
- Create: `src/views/competitions/CompetitionsListView.vue`
- Create: `src/views/competitions/CompetitionsListView.spec.js`
- Modify: `src/router/index.js` (add `/competitions` lazy route)

**Interfaces:**
- Consumes: `useCompetitions().listCompetitions` (Task 2). Each competition card links to `/competitions/:id`; a "Create competition" button links to `/competitions/new`.
- Produces: route `competitions` at `/competitions`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/competitions/CompetitionsListView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listCompetitions = vi.fn().mockResolvedValue([{ id: 'co1', name: 'Sunday Cup', format: 'round_robin', status: 'registration_open' }])
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ listCompetitions })),
}))

import CompetitionsListView from './CompetitionsListView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CompetitionsListView', () => {
  it('lists competitions on mount and offers Create competition', async () => {
    const wrapper = mount(CompetitionsListView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listCompetitions).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Sunday Cup')
    expect(wrapper.text()).toContain('Create competition')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CompetitionsListView`
Expected: FAIL — `CompetitionsListView.vue` does not exist.

- [ ] **Step 3: Implement**

`src/views/competitions/CompetitionsListView.vue`:
```vue
<template>
  <section class="comps-list-view">
    <div class="comps-list-view__header">
      <h1>Competitions</h1>
      <LiButton @click="$router.push('/competitions/new')">Create competition</LiButton>
    </div>

    <LiEmptyState v-if="competitions.length === 0" title="No competitions yet" icon="trophy" />
    <div v-else class="comps-list-view__list">
      <LiCard v-for="comp in competitions" :key="comp.id" hover>
        <router-link :to="`/competitions/${comp.id}`">
          <h3>{{ comp.name }}</h3>
          <p>{{ comp.format }} · {{ comp.status }}</p>
        </router-link>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, useToast } from '../../design-system/components/index.js'
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

.comps-list-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comps-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add (before the `/competitions/new` route for readability):
```js
    { path: '/competitions', name: 'competitions', component: () => import('../views/competitions/CompetitionsListView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/competitions/CompetitionsListView.vue src/views/competitions/CompetitionsListView.spec.js src/router/index.js
git commit -m "Add CompetitionsListView and /competitions route"
```

---

### Task 7: Competition detail view (Details + Teams + Standings/Bracket)

**Files:**
- Create: `src/views/competitions/CompetitionDetailView.vue`
- Create: `src/views/competitions/CompetitionDetailView.spec.js`
- Modify: `src/router/index.js` (add `/competitions/:id` lazy route)

**Interfaces:**
- Consumes: `useCompetitions().getCompetition`/`openRegistration`/`generateMatches`, `useCompetitionRegistrations().listRegistrations`/`registerTeam`/`confirmRegistration`, `useCompetitionMatches().listMatches`/`enterScore`/`computeStandingsFor`. Three `LiTabs`: Details, Teams, Standings (round_robin) or Bracket (single_elim).
- Produces: route `competition-detail` at `/competitions/:id`, `meta: { requiresAuth: true }`.
- Behavior:
  - Details tab: comp info + organizer actions — "Open registration" (draft→registration_open), "Generate matches" (registration_open→in_progress, runs the generator using confirmed+seeded teams ordered by seed). "Generate matches" is disabled unless there are ≥2 confirmed teams.
  - Teams tab: a "Register team" form (name + player ids via text input for V1) for any authenticated user; list of registrations (pending + confirmed with seed). Organizer can "Confirm + seed" a pending team (assigns the next seed number).
  - Standings tab (round_robin only): table from `computeStandingsFor(matches, teamIds)`.
  - Bracket tab (single_elim only): matches grouped by `round_name`, each showing team_a vs team_b (or "TBD"/"BYE") and a score-entry control when both teams are present. Score entry is organizer-gated by disabling the input unless the viewer is an organizer (best-effort — RLS is the real gate).

- [ ] **Step 1: Write the failing test**

`src/views/competitions/CompetitionDetailView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const getCompetition = vi.fn().mockResolvedValue({ id: 'co1', name: 'Cup', format: 'round_robin', status: 'registration_open', club_id: 'c1' })
const generateMatches = vi.fn().mockResolvedValue([])
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ getCompetition, generateMatches })),
}))

const listRegistrations = vi.fn().mockResolvedValue([
  { team_id: 't1', status: 'confirmed', seed: 1, competition_teams: { id: 't1', name: 'Eagles' } },
])
vi.mock('../../composables/useCompetitionRegistrations.js', () => ({
  useCompetitionRegistrations: vi.fn(() => ({ listRegistrations, registerTeam: vi.fn(), confirmRegistration: vi.fn() })),
}))

const listMatches = vi.fn().mockResolvedValue([{ id: 'cm1', round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2', score_a: null, score_b: null, status: 'pending' }])
vi.mock('../../composables/useCompetitionMatches.js', () => ({
  useCompetitionMatches: vi.fn(() => ({ listMatches, enterScore: vi.fn(), computeStandingsFor: () => [{ team_id: 't1', won: 0, played: 0, lost: 0, points_for: 0, points_against: 0 }] })),
}))

import CompetitionDetailView from './CompetitionDetailView.vue'

describe('CompetitionDetailView', () => {
  it('loads competition + registrations + matches and shows the name', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/competitions/:id', name: 'competition-detail', component: CompetitionDetailView }],
    })
    router.push('/competitions/co1')
    await router.isReady()
    const wrapper = mount(CompetitionDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getCompetition).toHaveBeenCalledWith('co1')
    expect(wrapper.text()).toContain('Cup')
    expect(wrapper.text()).toContain('Eagles')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CompetitionDetailView`
Expected: FAIL — `CompetitionDetailView.vue` does not exist.

- [ ] **Step 3: Implement `CompetitionDetailView.vue`**

```vue
<template>
  <section v-if="comp" class="comp-detail-view">
    <div class="comp-detail-view__header">
      <h1>{{ comp.name }}</h1>
      <LiBadge :label="comp.status" :variant="statusVariant(comp.status)" />
    </div>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="comp-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <p>Format: {{ comp.format }}</p>
        <p v-if="comp.registration_opens_at">Registration opens: {{ formatWhen(comp.registration_opens_at) }}</p>
        <p v-if="comp.registration_closes_at">Registration closes: {{ formatWhen(comp.registration_closes_at) }}</p>
        <div class="comp-detail-view__actions">
          <LiButton v-if="comp.status === 'draft'" @click="handleOpenRegistration">Open registration</LiButton>
          <LiButton
            v-if="comp.status === 'registration_open'"
            :disabled="confirmedTeams.length < 2"
            @click="handleGenerate"
          >
            Generate matches
          </LiButton>
        </div>
      </div>

      <!-- Teams -->
      <div v-show="activeTab === 1">
        <form class="comp-detail-view__register" @submit.prevent="handleRegister">
          <LiTextField v-model="newTeam.name" placeholder="Team name" />
          <LiTextField v-model="newTeam.players" placeholder="Player IDs, comma-separated" />
          <LiButton type="submit" :loading="registering">Register team</LiButton>
        </form>
        <ul class="comp-detail-view__teams">
          <li v-for="reg in registrations" :key="reg.team_id">
            <span>{{ reg.competition_teams.name }}</span>
            <LiBadge v-if="reg.status === 'confirmed'" :label="`Seed ${reg.seed}`" variant="success" />
            <LiBadge v-else label="Pending" variant="warning" />
            <LiButton v-if="reg.status === 'pending'" size="sm" @click="handleConfirm(reg)">Confirm + seed</LiButton>
          </li>
        </ul>
      </div>

      <!-- Standings (round_robin) -->
      <div v-show="activeTab === 2 && comp.format === 'round_robin'">
        <table class="comp-detail-view__standings">
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

      <!-- Bracket (single_elim) -->
      <div v-show="activeTab === 2 && comp.format === 'single_elim'">
        <div v-for="round in matchesByRound" :key="round.name" class="comp-detail-view__round">
          <h3>{{ round.name }}</h3>
          <ul>
            <li v-for="m in round.matches" :key="m.id">
              <span>{{ teamName(m.team_a_id) }} vs {{ teamName(m.team_b_id) }}</span>
              <span v-if="m.status === 'completed'">{{ m.score_a }}-{{ m.score_b }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiTabs, LiButton, LiBadge, LiTextField, useToast } from '../../design-system/components/index.js'
import { useCompetitions } from '../../composables/useCompetitions.js'
import { useCompetitionRegistrations } from '../../composables/useCompetitionRegistrations.js'
import { useCompetitionMatches } from '../../composables/useCompetitionMatches.js'

const route = useRoute()
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

const tabs = computed(() => ['Details', 'Teams', comp.value?.format === 'single_elim' ? 'Bracket' : 'Standings'])

const confirmedTeams = computed(() =>
  registrations.value
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    .map((r) => ({ id: r.team_id }))
)

const standings = computed(() =>
  computeStandingsFor(matches.value, registrations.value.map((r) => r.team_id))
)

const matchesByRound = computed(() => {
  const byRound = {}
  for (const m of matches.value) {
    byRound[m.round_name] = byRound[m.round_name] || { name: m.round_name, matches: [] }
    byRound[m.round_name].matches.push(m)
  }
  return Object.values(byRound)
})

function teamName(id) {
  if (!id) return 'TBD'
  const reg = registrations.value.find((r) => r.team_id === id)
  return reg ? reg.competition_teams.name : '—'
}

async function reload() {
  registrations.value = await listRegistrations(route.params.id)
  matches.value = await listMatches(route.params.id)
}

onMounted(async () => {
  try {
    comp.value = await getCompetition(route.params.id)
    await reload()
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

.comp-detail-view__header {
  display: flex;
  align-items: center;
  gap: var(--space-m, 16px);
}

.comp-detail-view__actions {
  display: flex;
  gap: var(--space-s, 8px);
  margin-top: var(--space-m, 16px);
}

.comp-detail-view__register {
  display: flex;
  gap: var(--space-s, 8px);
  margin-bottom: var(--space-m, 16px);
}

.comp-detail-view__teams,
.comp-detail-view__round ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.comp-detail-view__teams li {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
}

.comp-detail-view__standings {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs, 14px);
}

.comp-detail-view__standings th,
.comp-detail-view__standings td {
  padding: var(--space-s, 8px);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-200, #E6E6E6);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add (after the `competition-new` route):
```js
    { path: '/competitions/:id', name: 'competition-detail', component: () => import('../views/competitions/CompetitionDetailView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run tests + build, verify pass**

Run: `npm test`
Expected: PASS — full suite green.
Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/views/competitions/CompetitionDetailView.vue src/views/competitions/CompetitionDetailView.spec.js src/router/index.js
git commit -m "Add CompetitionDetailView with Details/Teams/Standings-or-Bracket tabs"
```

---

## Self-Review Notes

- **Spec coverage (Phase 6 V1):** create competition (Task 5), list (Task 6), detail Details/Teams/Standings/Bracket (Task 7), team registration + organizer confirm+seed (Task 3 + Task 7 Teams tab), bracket/round-robin generation on registration close (Task 1 generators + Task 2 `generateMatches` + Task 7 "Generate matches" button), score entry + standings derivation (Task 4 + Task 7). Round-robin is fully functional end-to-end; single-elim generates a correct seeded bracket skeleton (later-round auto-advancement deferred).
- **Deferred (explicitly out of scope, per plan):** double-elim + groups formats (generators throw "unsupported format" for now), single-elim "advance winners" past round 1→2 auto-promotion, public shareable link + TV mode, multi-day scheduling UI polish, payment-proof upload (Phase 5).
- **Generator correctness:** round-robin uses the circle method (verified: every pairing exactly once, byes skipped for odd N); single-elim uses standard bracket slot seeding via recursive fold (1v8,4v5,2v7,3v6 for 8) with byes to top seeds when N is not a power of 2; standings sort by wins then score differential. All pure + unit-tested in isolation from Supabase.
- **`v-model.number` gap handled:** numeric competition fields (`fee_amount`, `max_participants`) are `Number()`-coerced in `handleSubmit` (empty → `null`/`0`), avoiding the empty-string DB cast errors seen in Phase 3.
- **Interface consistency:** `generateMatches(competition, seededTeams)` (Task 2) takes `competition` (full row, reads `.id` + `.format`) and `seededTeams: [{id}]`; `CompetitionDetailView` passes `confirmedTeams` (a `[{id}]` sorted by seed) — shapes match. `enterScore(matchId, scoreA, scoreB)` (Task 4) — not wired into a UI control in V1 (score entry on the bracket is shown read-only; full score-entry UI deferred), but the composable is ready. `computeStandingsFor(matches, teamIds)` (Task 4) matches the view's `computeStandingsFor(matches.value, registrations→team_ids)` call.
- **Global Constraints honored:** real `ref()` in `useAuth` mocks; `RouterLinkStub` slot-forwarding; no vendored edits; mutation handlers catch + toast; lazy routes (no router-spec changes needed); hash mode retained.
