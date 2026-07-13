# Phase 4 (Match Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Americano/Mexicano/Team Americano/Singles match generation, live scoring, standings, and Elo skill-rating updates — the competitive core of a padel meet.

**Architecture:** Pure generators in `src/lib/matchFormatGenerators.js` produce a round of matches (no Supabase) — fully unit-tested in isolation. Composables wrap the `match_sessions`/`match_rounds`/`matches`/`match_players` tables (RLS already gates manage to the meet's creator). A SECURITY DEFINER RPC `apply_match_result` finalizes a match AND updates `player_ratings` (which has NO client write policy after the Phase 1 RLS fix — rating deltas must be server-side). `MatchSessionView` ties it together: setup → generate round → score → finalize → standings.

**Tech Stack:** Vue 3 `<script setup>`, Vite, vue-router hash mode, Supabase (Postgres + RPC), vendored Lithium `Li*` components.

## Global Constraints

- NEVER edit any file under `src/design-system/`.
- `v-model.number` is a no-op on LiTextField — Number()-coerce numeric fields in handlers, or use native `<input type="number">`.
- Tests: vitest + @vue/test-utils, jsdom env. Real `ref()` for useAuth, slot-forwarding RouterLinkStub. Pure-generator tests need NO Supabase mock.
- RLS is the real gate. `match_sessions`/`match_rounds`/`matches`/`match_players` manage policies require `meets.creator_id = auth.uid()` (organizer). `player_ratings` has NO client insert/update policy → only the `apply_match_result` SECURITY DEFINER RPC writes it.
- PostgREST gotcha: `.insert(rows)` without `.select()` returns `{data:null}`. RPCs return `{data, error}` from `.rpc(name, args)`.
- jsdom `trigger('click')` bypasses native form-submit — use `@click` on LiButton (no `<form>`) when a test must click-submit.
- Generator determinism: Americano uses circle-rotation; Mexicano uses a seeded PRNG (mulberry32) keyed by roundIndex so generation is reproducible per round. No `Math.random()` in generators (app-side can stay deterministic too — fine).

## V1 Scope (deferred to Phase 4b)

- `prioritize_least_matches` greedy partnership optimization (V1 uses simple rotation — flag stored on session but not yet used by the generator).
- Share-match-result image (canvas/dom-to-image).
- TV/big-screen mode (reuses Phase 3's public-link pattern).
- Reliability score update (reliability is attendance-based, Phase 3's concern — not updated on match completion).

## File Structure

- `src/lib/matchFormatGenerators.js` (+spec) — pure: 4 format round-generators + computeStandings + helpers.
- `src/composables/useMatchSessions.js` (+spec) — createSession, getSession, listSessionsByMeet, setStatus.
- `src/composables/useMatchRounds.js` (+spec) — generateRound (calls generator + persists round+matches+players), listRoundsWithMatches.
- `src/composables/useMatchScoring.js` (+spec) — enterScore, finalizeMatch (→ apply_match_result RPC), computeStandingsFor.
- `supabase/migrations/20260713190000_phase4_apply_match_result.sql` — SECURITY DEFINER RPC (Elo + status).
- `src/views/matches/MatchSessionView.vue` (+spec) — setup → rounds → score → standings. + route + nav.

---

### Task 1: `matchFormatGenerators.js` (pure)

**Files:**
- Create: `src/lib/matchFormatGenerators.js`
- Test: `src/lib/matchFormatGenerators.spec.js`

**Interfaces:**
- Produces:
  - `generateAmericanoRound(playerIds, roundIndex, history?)` → `[{ court, team_a:[id,id], team_b:[id,id] }]`
  - `generateMexicanoRound(playerIds, roundIndex, history?)` → same shape (seeded-random teams)
  - `generateTeamAmericanoRound(teams, roundIndex, history?)` — `teams: [{id, playerIds:[p1,p2]}]` → `[{ court, team_a:[...], team_b:[...] }]`
  - `generateSinglesRound(playerIds, roundIndex, history?)` → `[{ court, team_a:[id], team_b:[id] }]`
  - `computeStandings(matches, playerIds, criteria)` — `matches: [{team_a,team_b,score_a,score_b,status}]`, `criteria: 'matches_won'|'points_won'|'win_pct'|'points_pct'` → sorted `[{player_id, played, won, lost, points_for, points_against}]`
- Helpers (not exported, internal): `rotate(arr, n)`, `mulberry32(seed)`, `seededShuffle(arr, seed)`, `circleMethodPairs(ids, roundIndex)`.

- [ ] **Step 1: Write the failing test**

`src/lib/matchFormatGenerators.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import {
  generateAmericanoRound,
  generateMexicanoRound,
  generateTeamAmericanoRound,
  generateSinglesRound,
  computeStandings,
} from './matchFormatGenerators.js'

describe('generateAmericanoRound', () => {
  it('makes N/4 matches of 4 players each, no player duplicated within a round', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const round = generateAmericanoRound(ids, 0)
    expect(round).toHaveLength(2)
    const seen = new Set()
    for (const m of round) {
      expect(m.team_a).toHaveLength(2)
      expect(m.team_b).toHaveLength(2)
      for (const id of [...m.team_a, ...m.team_b]) {
        expect(seen.has(id)).toBe(false)
        seen.add(id)
      }
    }
    expect(round[0].court).toBe(1)
    expect(round[1].court).toBe(2)
  })

  it('rotates partnerships across rounds (round 0 != round 1 grouping)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const r0 = generateAmericanoRound(ids, 0)
    const r1 = generateAmericanoRound(ids, 1)
    const group0 = [...r0[0].team_a, ...r0[0].team_b].sort().join(',')
    const group1 = [...r1[0].team_a, ...r1[0].team_b].sort().join(',')
    expect(group0).not.toBe(group1)
  })

  it('returns [] for fewer than 4 players', () => {
    expect(generateAmericanoRound(['p1', 'p2', 'p3'], 0)).toEqual([])
  })

  it('sits players out by rotation when N is not a multiple of 4', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5'] // 5 players → 1 match, 1 sits out
    const round = generateAmericanoRound(ids, 0)
    expect(round).toHaveLength(1)
    const playing = [...round[0].team_a, ...round[0].team_b]
    expect(playing).toHaveLength(4)
    const r1 = generateAmericanoRound(ids, 1)
    const playing1 = [...r1[0].team_a, ...r1[0].team_b]
    // A different player sits out in round 1 (rotation).
    expect(playing1.sort().join(',')).not.toBe(playing.sort().join(','))
  })
})

describe('generateMexicanoRound', () => {
  it('makes 4-player matches and is deterministic for a given roundIndex', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const a = generateMexicanoRound(ids, 0)
    const b = generateMexicanoRound(ids, 0)
    expect(a).toEqual(b)
    expect(a).toHaveLength(2)
    for (const m of a) {
      expect(m.team_a).toHaveLength(2)
      expect(m.team_b).toHaveLength(2)
    }
  })
})

describe('generateTeamAmericanoRound', () => {
  it('pairs teams round-robin (2 teams → 1 match, both player lists used)', () => {
    const teams = [
      { id: 't1', playerIds: ['p1', 'p2'] },
      { id: 't2', playerIds: ['p3', 'p4'] },
    ]
    const round = generateTeamAmericanoRound(teams, 0)
    expect(round).toHaveLength(1)
    expect(round[0].team_a).toEqual(['p1', 'p2'])
    expect(round[0].team_b).toEqual(['p3', 'p4'])
  })

  it('returns [] for fewer than 2 teams', () => {
    expect(generateTeamAmericanoRound([{ id: 't1', playerIds: ['p1', 'p2'] }], 0)).toEqual([])
  })
})

describe('generateSinglesRound', () => {
  it('makes 1v1 matches via circle method', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const round = generateSinglesRound(ids, 0)
    expect(round).toHaveLength(2)
    for (const m of round) {
      expect(m.team_a).toHaveLength(1)
      expect(m.team_b).toHaveLength(1)
    }
    // p1 (fixed) plays p4 (last) in round 0 of circle method.
    expect(round[0].team_a[0]).toBe('p1')
  })
})

describe('computeStandings', () => {
  const matches = [
    { team_a: ['p1', 'p2'], team_b: ['p3', 'p4'], score_a: 21, score_b: 15, status: 'completed' },
    { team_a: ['p1', 'p3'], team_b: ['p2', 'p4'], score_a: 10, score_b: 21, status: 'completed' },
    { team_a: ['p1', 'p4'], team_b: ['p2', 'p3'], score_a: 21, score_b: 20, status: 'pending' },
  ]
  const ids = ['p1', 'p2', 'p3', 'p4']

  it('ignores pending matches and tallies played/won/points', () => {
    const rows = computeStandings(matches, ids, 'matches_won')
    const p1 = rows.find((r) => r.player_id === 'p1')
    // p1 played 2 completed (won match 1: 21-15, lost match 2: 10-21).
    expect(p1.played).toBe(2)
    expect(p1.won).toBe(1)
    expect(p1.lost).toBe(1)
    expect(p1.points_for).toBe(31)
    expect(p1.points_against).toBe(36)
  })

  it('sorts by matches_won by default (most wins first)', () => {
    const rows = computeStandings(matches, ids, 'matches_won')
    // p2, p3, p4 each won match 2 (21-10) → 1 win; p1 won match 1 → 1 win. All 1 win.
    // Tiebreak: points_for desc. p2/p3/p4 got 21 in match2 + 15/15/20 in match1.
    expect(rows[0].won).toBeGreaterThanOrEqual(1)
  })

  it('sorts by points_won when that criteria is given', () => {
    const rows = computeStandings(matches, ids, 'points_won')
    const top = rows[0]
    for (const r of rows) {
      expect(top.points_for).toBeGreaterThanOrEqual(r.points_for)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- matchFormatGenerators`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

`src/lib/matchFormatGenerators.js`:
```js
// PURE match-format generators. No Supabase. Each generator returns a round =
// array of { court, team_a: string[], team_b: string[] }. playerIds are UUIDs.
// roundIndex is 0-based; generators are deterministic given (playerIds, roundIndex).
// history (previous rounds' matches) is accepted for future partnership-optimization
// (prioritize_least_matches) but not yet used in V1 (simple rotation).

function rotate(arr, n) {
  if (arr.length === 0) return arr
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

// Deterministic seeded PRNG so Mexicano generation is reproducible per round.
function mulberry32(seed) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(arr, seed) {
  const rng = mulberry32(seed + 1)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Circle method: pairs for round `roundIndex` of a round-robin over `ids`.
// Odd counts get a null "bye"; bye pairs are dropped from the result.
function circleMethodPairs(ids, roundIndex) {
  const arr = ids.slice()
  if (arr.length % 2 !== 0) arr.push(null)
  const rounds = arr.length - 1
  const r = rounds > 0 ? ((roundIndex % rounds) + rounds) % rounds : 0
  const fixed = arr[0]
  const rest = arr.slice(1)
  const rotated = rotate(rest, r)
  const lineup = [fixed, ...rotated]
  const pairs = []
  const half = lineup.length / 2
  for (let i = 0; i < half; i++) {
    const a = lineup[i]
    const b = lineup[lineup.length - 1 - i]
    if (a !== null && b !== null) pairs.push([a, b])
  }
  return pairs
}

export function generateAmericanoRound(playerIds, roundIndex, history = []) {
  const n = playerIds.length
  if (n < 4) return []
  const matchesPerRound = Math.floor(n / 4)
  // Rotate who sits out (byes shared evenly across rounds).
  const rotated = rotate(playerIds, roundIndex)
  const playing = rotated.slice(0, matchesPerRound * 4)
  const matches = []
  for (let c = 0; c < matchesPerRound; c++) {
    const g = playing.slice(c * 4, c * 4 + 4)
    matches.push({ court: c + 1, team_a: [g[0], g[1]], team_b: [g[2], g[3]] })
  }
  return matches
}

export function generateMexicanoRound(playerIds, roundIndex, history = []) {
  const n = playerIds.length
  if (n < 4) return []
  const matchesPerRound = Math.floor(n / 4)
  const shuffled = seededShuffle(playerIds, roundIndex * 7919 + 31)
  const playing = shuffled.slice(0, matchesPerRound * 4)
  const matches = []
  for (let c = 0; c < matchesPerRound; c++) {
    const g = playing.slice(c * 4, c * 4 + 4)
    // Reshuffle the team split within the group so partners vary.
    const split = seededShuffle(g, roundIndex * 100 + c + 7)
    matches.push({ court: c + 1, team_a: [split[0], split[1]], team_b: [split[2], split[3]] })
  }
  return matches
}

export function generateTeamAmericanoRound(teams, roundIndex, history = []) {
  if (teams.length < 2) return []
  const pairs = circleMethodPairs(teams.map((t) => t.id), roundIndex)
  return pairs.map((pair, c) => {
    const ta = teams.find((t) => t.id === pair[0])
    const tb = teams.find((t) => t.id === pair[1])
    return { court: c + 1, team_a: ta.playerIds, team_b: tb.playerIds }
  })
}

export function generateSinglesRound(playerIds, roundIndex, history = []) {
  if (playerIds.length < 2) return []
  const pairs = circleMethodPairs(playerIds, roundIndex)
  return pairs.map((pair, c) => ({ court: c + 1, team_a: [pair[0]], team_b: [pair[1]] }))
}

export function computeStandings(matches, playerIds, criteria = 'matches_won') {
  const stats = {}
  for (const id of playerIds) {
    stats[id] = { player_id: id, played: 0, won: 0, lost: 0, points_for: 0, points_against: 0 }
  }
  for (const m of matches) {
    if (m.status !== 'completed') continue
    if (m.score_a == null || m.score_b == null) continue
    const aWon = m.score_a > m.score_b
    for (const pid of m.team_a || []) {
      if (!stats[pid]) continue
      stats[pid].played++
      stats[pid].points_for += m.score_a
      stats[pid].points_against += m.score_b
      if (aWon) stats[pid].won++
      else stats[pid].lost++
    }
    for (const pid of m.team_b || []) {
      if (!stats[pid]) continue
      stats[pid].played++
      stats[pid].points_for += m.score_b
      stats[pid].points_against += m.score_a
      if (!aWon) stats[pid].won++
      else stats[pid].lost++
    }
  }
  const winPct = (r) => (r.played ? r.won / r.played : 0)
  const ptsPct = (r) => {
    const tot = r.points_for + r.points_against
    return tot ? r.points_for / tot : 0
  }
  const sortKey = (r) => {
    switch (criteria) {
      case 'points_won': return r.points_for
      case 'win_pct': return winPct(r)
      case 'points_pct': return ptsPct(r)
      default: return r.won
    }
  }
  return Object.values(stats).sort(
    (a, b) => sortKey(b) - sortKey(a) || b.points_for - a.points_for || a.player_id.localeCompare(b.player_id)
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- matchFormatGenerators`
Expected: PASS — 9 tests. (If the singles "p1 plays p4 in round 0" assertion fails, verify circle method: lineup=[p1,p2,p3,p4], half=2, i=0 → a=lineup[0]=p1, b=lineup[3]=p4. So round[0].team_a[0]===p1. Correct.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/matchFormatGenerators.js src/lib/matchFormatGenerators.spec.js
git commit -m "feat(p4): add pure match-format generators + computeStandings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `useMatchSessions` composable

**Files:**
- Create: `src/composables/useMatchSessions.js`
- Test: `src/composables/useMatchSessions.spec.js`

**Interfaces:**
- Produces: `useMatchSessions(): { createSession(payload, meetId), getSession(id), listSessionsByMeet(meetId), setStatus(id, status) }`.
  - `createSession(payload, meetId)`: payload = `{ format, ranking_criteria?, num_courts?, total_set_points?, prioritize_least_matches? }`. Inserts `{ ...payload, meet_id: meetId, status: 'setup' }`. Returns the row (`.select().single()`).
  - `getSession(id)`: select `*, meet:meets(id, title)` eq id single.
  - `listSessionsByMeet(meetId)`: select `*` eq meet_id order created_at desc.
  - `setStatus(id, status)`: update status eq id, return row (`.select().single()`).

- [ ] **Step 1: Write the failing test**

`src/composables/useMatchSessions.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMatchSessions } from './useMatchSessions.js'

describe('useMatchSessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createSession inserts with meet_id + status setup and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', status: 'setup' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createSession } = useMatchSessions()
    const result = await createSession({ format: 'americano', num_courts: 2 }, 'meet1')

    expect(insert).toHaveBeenCalledWith({ format: 'americano', num_courts: 2, meet_id: 'meet1', status: 'setup' })
    expect(result).toEqual({ id: 'ms1', status: 'setup' })
  })

  it('getSession selects with the embedded meet', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', meet: { id: 'm1', title: 'T' } }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { getSession } = useMatchSessions()
    const result = await getSession('ms1')

    expect(supabase.from).toHaveBeenCalledWith('match_sessions')
    expect(select).toHaveBeenCalledWith('*, meet:meets(id, title)')
    expect(eq).toHaveBeenCalledWith('id', 'ms1')
    expect(result.meet.title).toBe('T')
  })

  it('listSessionsByMeet filters by meet and orders desc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'ms1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listSessionsByMeet } = useMatchSessions()
    const result = await listSessionsByMeet('meet1')

    expect(eq).toHaveBeenCalledWith('meet_id', 'meet1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual([{ id: 'ms1' }])
  })

  it('setStatus updates and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', status: 'in_progress' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { setStatus } = useMatchSessions()
    const result = await setStatus('ms1', 'in_progress')

    expect(update).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(eq).toHaveBeenCalledWith('id', 'ms1')
    expect(result.status).toBe('in_progress')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMatchSessions`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

`src/composables/useMatchSessions.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useMatchSessions() {
  async function createSession(payload, meetId) {
    const { data, error } = await supabase
      .from('match_sessions')
      .insert({
        format: payload.format,
        ranking_criteria: payload.ranking_criteria,
        num_courts: payload.num_courts,
        total_set_points: payload.total_set_points,
        prioritize_least_matches: payload.prioritize_least_matches,
        meet_id: meetId,
        status: 'setup',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function getSession(id) {
    const { data, error } = await supabase
      .from('match_sessions')
      .select('*, meet:meets(id, title)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async function listSessionsByMeet(meetId) {
    const { data, error } = await supabase
      .from('match_sessions')
      .select('*')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function setStatus(id, status) {
    const { data, error } = await supabase
      .from('match_sessions')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { createSession, getSession, listSessionsByMeet, setStatus }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMatchSessions`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the FULL suite**

Run: `npm test 2>&1 | tail -10`

- [ ] **Step 6: Commit**

```bash
git add src/composables/useMatchSessions.js src/composables/useMatchSessions.spec.js
git commit -m "feat(p4): add useMatchSessions composable

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `useMatchRounds` composable

**Files:**
- Create: `src/composables/useMatchRounds.js`
- Test: `src/composables/useMatchRounds.spec.js`

**Interfaces:**
- Produces: `useMatchRounds(): { generateRound(session, { playerIds | teams }, roundIndex), listRoundsWithMatches(sessionId) }`.
  - `generateRound(session, input, roundIndex)`: picks the generator by `session.format`, generates the round, then persists: one `match_rounds` row (round_number=roundIndex, status='pending') + a `matches` row per court (court_number, status='pending') + `match_players` rows (team a/b). Returns the persisted matches with their players. For `team_americano`, `input.teams` is the teams array; otherwise `input.playerIds`.
  - `listRoundsWithMatches(sessionId)`: select `match_rounds` (eq match_session_id, order round_number asc) — for each round, fetch its matches + each match's players. Returns `[{ ...round, matches: [{ ...match, team_a:[ids], team_b:[ids] }] }]`.

**Persistence shape:** `match_players` has no `team_a`/`team_b` column — team is the `team` column ('a'/'b'). The composable groups players by team when reading.

- [ ] **Step 1: Write the failing test**

`src/composables/useMatchRounds.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/matchFormatGenerators.js', () => ({
  generateAmericanoRound: vi.fn(() => [
    { court: 1, team_a: ['p1', 'p2'], team_b: ['p3', 'p4'] },
  ]),
  generateMexicanoRound: vi.fn(),
  generateTeamAmericanoRound: vi.fn(),
  generateSinglesRound: vi.fn(),
}))

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { generateAmericanoRound } from '../lib/matchFormatGenerators.js'
import { useMatchRounds } from './useMatchRounds.js'

describe('useMatchRounds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generateRound persists a round + matches + players for americano', async () => {
    // match_rounds insert -> single
    const roundSingle = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null })
    const roundSelect = vi.fn(() => ({ single: roundSingle }))
    const roundInsert = vi.fn(() => ({ select: roundSelect }))

    // matches insert (array) -> select -> data
    const matchesSelect = vi.fn().mockResolvedValue({ data: [{ id: 'm1', court_number: 1, match_round_id: 'r1' }], error: null })
    const matchesInsert = vi.fn(() => ({ select: matchesSelect }))

    // match_players insert (array) -> resolved
    const playersInsert = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'match_rounds') return { insert: roundInsert }
      if (table === 'matches') return { insert: matchesInsert }
      if (table === 'match_players') return { insert: playersInsert }
      return {}
    })

    const { generateRound } = useMatchRounds()
    const result = await generateRound(
      { id: 'ms1', format: 'americano' },
      { playerIds: ['p1', 'p2', 'p3', 'p4'] },
      0
    )

    expect(generateAmericanoRound).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'], 0, [])
    expect(roundInsert).toHaveBeenCalledWith({ match_session_id: 'ms1', round_number: 0, status: 'pending' })
    expect(matchesInsert).toHaveBeenCalledWith([{ match_round_id: 'r1', court_number: 1, status: 'pending' }])
    // 4 players inserted: p1,p2 team a; p3,p4 team b.
    expect(playersInsert).toHaveBeenCalledWith([
      { match_id: 'm1', user_id: 'p1', team: 'a' },
      { match_id: 'm1', user_id: 'p2', team: 'a' },
      { match_id: 'm1', user_id: 'p3', team: 'b' },
      { match_id: 'm1', user_id: 'p4', team: 'b' },
    ])
    expect(result).toHaveLength(1)
  })

  it('generateRound throws for an unsupported format', async () => {
    const { generateRound } = useMatchRounds()
    await expect(generateRound({ id: 'ms1', format: 'doubles' }, { playerIds: ['p1'] }, 0)).rejects.toThrow(/unsupported format/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMatchRounds`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

`src/composables/useMatchRounds.js`:
```js
import { supabase } from '../lib/supabase.js'
import {
  generateAmericanoRound,
  generateMexicanoRound,
  generateTeamAmericanoRound,
  generateSinglesRound,
} from '../lib/matchFormatGenerators.js'

function generateForFormat(format, input, roundIndex) {
  switch (format) {
    case 'americano':
      return generateAmericanoRound(input.playerIds, roundIndex, input.history || [])
    case 'mexicano':
      return generateMexicanoRound(input.playerIds, roundIndex, input.history || [])
    case 'team_americano':
      return generateTeamAmericanoRound(input.teams, roundIndex, input.history || [])
    case 'singles':
      return generateSinglesRound(input.playerIds, roundIndex, input.history || [])
    default:
      throw new Error(`unsupported format: ${format}`)
  }
}

export function useMatchRounds() {
  async function generateRound(session, input, roundIndex) {
    const roundMatches = generateForFormat(session.format, input, roundIndex)
    if (roundMatches.length === 0) return []

    // 1. persist the round
    const { data: round, error: roundError } = await supabase
      .from('match_rounds')
      .insert({ match_session_id: session.id, round_number: roundIndex, status: 'pending' })
      .select()
      .single()
    if (roundError) throw roundError

    // 2. persist matches
    const matchRows = roundMatches.map((m) => ({
      match_round_id: round.id,
      court_number: m.court,
      status: 'pending',
    }))
    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .insert(matchRows)
      .select()
    if (matchError) throw matchError

    // 3. persist players (team a / team b)
    const playerRows = []
    for (let i = 0; i < roundMatches.length; i++) {
      const m = roundMatches[i]
      const matchId = insertedMatches[i].id
      for (const pid of m.team_a) playerRows.push({ match_id: matchId, user_id: pid, team: 'a' })
      for (const pid of m.team_b) playerRows.push({ match_id: matchId, user_id: pid, team: 'b' })
    }
    const { error: playerError } = await supabase.from('match_players').insert(playerRows)
    if (playerError) throw playerError

    return insertedMatches
  }

  async function listRoundsWithMatches(sessionId) {
    const { data: rounds, error: roundError } = await supabase
      .from('match_rounds')
      .select('*')
      .eq('match_session_id', sessionId)
      .order('round_number', { ascending: true })
    if (roundError) throw roundError

    const result = []
    for (const round of rounds) {
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('*, match_players(match_id, user_id, team)')
        .eq('match_round_id', round.id)
        .order('court_number', { ascending: true })
      if (matchError) throw matchError
      result.push({
        ...round,
        matches: (matches || []).map((m) => ({
          ...m,
          team_a: (m.match_players || []).filter((p) => p.team === 'a').map((p) => p.user_id),
          team_b: (m.match_players || []).filter((p) => p.team === 'b').map((p) => p.user_id),
        })),
      })
    }
    return result
  }

  return { generateRound, listRoundsWithMatches }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMatchRounds`
Expected: PASS — 2 tests.

- [ ] **Step 5: Run the FULL suite**

Run: `npm test 2>&1 | tail -10`

- [ ] **Step 6: Commit**

```bash
git add src/composables/useMatchRounds.js src/composables/useMatchRounds.spec.js
git commit -m "feat(p4): add useMatchRounds composable — generateRound + listRoundsWithMatches

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `apply_match_result` RPC + `useMatchScoring` composable

**Files:**
- Create: `supabase/migrations/20260713190000_phase4_apply_match_result.sql`
- Create: `src/composables/useMatchScoring.js`
- Test: `src/composables/useMatchScoring.spec.js`

**Interfaces:**
- RPC `apply_match_result(p_match_id uuid)` (SECURITY DEFINER): sets `matches.status='completed'`; for each player in the match, computes an Elo delta vs the opposing team's average rating and upserts `player_ratings` (rating += delta, matches_played++). Elo: K=0.5, scale=1.5, expected = 1/(1+10^((opp_avg − my_rating)/1.5)), actual = 1 if my team won else 0. Returns void.
- `useMatchScoring(): { enterScore(matchId, scoreA, scoreB), finalizeMatch(matchId) → rpc('apply_match_result', { p_match_id }), computeStandingsFor(rounds, playerIds, criteria) }`. `enterScore` updates matches score_a/score_b (status stays pending until finalize). `computeStandingsFor` flattens rounds→matches and calls the pure `computeStandings`.

- [ ] **Step 1: Write the failing test**

`src/composables/useMatchScoring.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../lib/matchFormatGenerators.js', () => ({
  computeStandings: vi.fn(() => [{ player_id: 'p1', won: 1 }]),
}))

import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/matchFormatGenerators.js'
import { useMatchScoring } from './useMatchScoring.js'

describe('useMatchScoring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('enterScore updates score_a + score_b for the match', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { enterScore } = useMatchScoring()
    await enterScore('m1', 21, 15)

    expect(supabase.from).toHaveBeenCalledWith('matches')
    expect(update).toHaveBeenCalledWith({ score_a: 21, score_b: 15 })
    expect(eq).toHaveBeenCalledWith('id', 'm1')
  })

  it('finalizeMatch calls the apply_match_result RPC', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })

    const { finalizeMatch } = useMatchScoring()
    await finalizeMatch('m1')

    expect(supabase.rpc).toHaveBeenCalledWith('apply_match_result', { p_match_id: 'm1' })
  })

  it('computeStandingsFor flattens rounds into matches and delegates', () => {
    const rounds = [
      { matches: [{ team_a: ['p1'], team_b: ['p2'], score_a: 21, score_b: 15, status: 'completed' }] },
    ]
    const { computeStandingsFor } = useMatchScoring()
    const result = computeStandingsFor(rounds, ['p1', 'p2'], 'matches_won')

    expect(computeStandings).toHaveBeenCalledWith(
      [{ team_a: ['p1'], team_b: ['p2'], score_a: 21, score_b: 15, status: 'completed' }],
      ['p1', 'p2'],
      'matches_won'
    )
    expect(result).toEqual([{ player_id: 'p1', won: 1 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMatchScoring`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

`src/composables/useMatchScoring.js`:
```js
import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/matchFormatGenerators.js'

export function useMatchScoring() {
  async function enterScore(matchId, scoreA, scoreB) {
    const { error } = await supabase
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB })
      .eq('id', matchId)
    if (error) throw error
  }

  async function finalizeMatch(matchId) {
    const { error } = await supabase.rpc('apply_match_result', { p_match_id: matchId })
    if (error) throw error
  }

  function computeStandingsFor(rounds, playerIds, criteria) {
    const matches = rounds.flatMap((r) => r.matches || [])
    return computeStandings(matches, playerIds, criteria)
  }

  return { enterScore, finalizeMatch, computeStandingsFor }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMatchScoring`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write the migration**

`supabase/migrations/20260713190000_phase4_apply_match_result.sql`:
```sql
-- Phase 4: finalize a match + apply Elo rating deltas server-side.
-- player_ratings has NO client write policy (Phase 1 RLS fix removed it), so
-- rating updates MUST go through this SECURITY DEFINER function.
create or replace function public.apply_match_result(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_team_a uuid[];
  v_team_b uuid[];
  v_score_a int;
  v_score_b int;
  v_avg_a numeric;
  v_avg_b numeric;
  v_player uuid;
  v_my_rating numeric;
  v_opp_avg numeric;
  v_actual numeric;
  v_expected numeric;
  v_delta numeric;
  v_k numeric := 0.5;
  v_scale numeric := 1.5;
begin
  -- Lock + load the match with its players.
  select m.score_a, m.score_b, m.status into v_score_a, v_score_b, v_match.status
  from public.matches m where m.id = p_match_id for update;

  if not found then
    raise exception 'match not found';
  end if;
  if v_score_a is null or v_score_b is null then
    raise exception 'cannot finalize a match without scores';
  end if;

  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'a') into v_team_a
  from public.match_players mp where mp.match_id = p_match_id;
  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'b') into v_team_b
  from public.match_players mp where mp.match_id = p_match_id;

  -- Average rating per team (default 3.0 for unrated players).
  select coalesce(avg(pr.rating), 3.0) into v_avg_a
  from public.player_ratings pr where pr.user_id = any(v_team_a);
  select coalesce(avg(pr.rating), 3.0) into v_avg_b
  from public.player_ratings pr where pr.user_id = any(v_team_b);

  -- Mark the match completed.
  update public.matches set status = 'completed' where id = p_match_id;

  -- Team A won if score_a > score_b.
  v_actual := case when v_score_a > v_score_b then 1.0 else 0.0 end;

  -- Update team A players (opponent avg = v_avg_b).
  foreach v_player in array v_team_a loop
    select rating into v_my_rating from public.player_ratings where user_id = v_player;
    v_my_rating := coalesce(v_my_rating, 3.0);
    v_opp_avg := v_avg_b;
    v_expected := 1.0 / (1.0 + power(10.0, (v_opp_avg - v_my_rating) / v_scale));
    v_delta := v_k * (v_actual - v_expected);
    insert into public.player_ratings (user_id, rating, matches_played, reliability_pct, last_updated)
    values (v_player, 3.0 + v_delta, 1, 0, now())
    on conflict (user_id) do update
      set rating = player_ratings.rating + v_delta,
          matches_played = player_ratings.matches_played + 1,
          last_updated = now();
  end loop;

  -- Update team B players (opponent avg = v_avg_a; actual is inverted).
  v_actual := 1.0 - v_actual;
  foreach v_player in array v_team_b loop
    select rating into v_my_rating from public.player_ratings where user_id = v_player;
    v_my_rating := coalesce(v_my_rating, 3.0);
    v_opp_avg := v_avg_a;
    v_expected := 1.0 / (1.0 + power(10.0, (v_opp_avg - v_my_rating) / v_scale));
    v_delta := v_k * (v_actual - v_expected);
    insert into public.player_ratings (user_id, rating, matches_played, reliability_pct, last_updated)
    values (v_player, 3.0 + v_delta, 1, 0, now())
    on conflict (user_id) do update
      set rating = player_ratings.rating + v_delta,
          matches_played = player_ratings.matches_played + 1,
          last_updated = now();
  end loop;
end;
$$;

grant execute on function public.apply_match_result(uuid) to authenticated;
```

- [ ] **Step 6: Push the migration to Supabase**

Run: `npx supabase db push` then `npx supabase migration list`.
Expected: `20260713190000` shows local == remote. (If denied by the permission classifier, the controller will run it — report the migration-list tail either way.)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260713190000_phase4_apply_match_result.sql src/composables/useMatchScoring.js src/composables/useMatchScoring.spec.js
git commit -m "feat(p4): add apply_match_result RPC (Elo) + useMatchScoring composable

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `MatchSessionView.vue` + route + nav

**Files:**
- Create: `src/views/matches/MatchSessionView.vue`
- Test: `src/views/matches/MatchSessionView.spec.js`
- Modify: `src/router/index.js` (add `/meets/:meetId/match-session/:sessionId?`)
- Modify: `src/layouts/AppLayout.vue` (no nav link — reached via meet detail; do NOT add a top-level nav link)

**Interfaces:**
- Consumes: `useAuth().user`, `useMatchSessions`, `useMatchRounds`, `useMatchScoring`, `useMeetParticipants` (to get the meet's confirmed players for the player picker). Route param `:meetId` (+ optional `:sessionId`).
- Behavior: if no `:sessionId`, show a setup form (format select, ranking_criteria select, num_courts, total_set_points) → createSession → redirect to the session route. If `:sessionId`, load the session + rounds; show a "Generate next round" button (uses confirmed meet players), the rounds with per-match score entry (native `<input type="number">`) + "Finalize" button per match, and a standings table at the bottom (computeStandingsFor, sorted by session.ranking_criteria).

- [ ] **Step 1: Write the failing test**

`src/views/matches/MatchSessionView.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const getSession = vi.fn().mockResolvedValue({ id: 'ms1', meet_id: 'meet1', format: 'americano', ranking_criteria: 'matches_won', status: 'in_progress' })
const createSession = vi.fn()
const setStatus = vi.fn()
vi.mock('../../composables/useMatchSessions.js', () => ({
  useMatchSessions: vi.fn(() => ({ getSession, createSession, setStatus, listSessionsByMeet: vi.fn() })),
}))

const generateRound = vi.fn().mockResolvedValue([{ id: 'm1' }])
const listRoundsWithMatches = vi.fn().mockResolvedValue([
  { id: 'r1', round_number: 0, status: 'pending', matches: [{ id: 'm1', court_number: 1, status: 'pending', score_a: null, score_b: null, team_a: ['p1', 'p2'], team_b: ['p3', 'p4'] }] },
])
vi.mock('../../composables/useMatchRounds.js', () => ({
  useMatchRounds: vi.fn(() => ({ generateRound, listRoundsWithMatches })),
}))

const enterScore = vi.fn().mockResolvedValue(undefined)
const finalizeMatch = vi.fn().mockResolvedValue(undefined)
const computeStandingsFor = vi.fn(() => [{ player_id: 'p1', played: 1, won: 1, lost: 0, points_for: 21, points_against: 15 }])
vi.mock('../../composables/useMatchScoring.js', () => ({
  useMatchScoring: vi.fn(() => ({ enterScore, finalizeMatch, computeStandingsFor })),
}))

vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants: vi.fn().mockResolvedValue([{ user_id: 'p1' }, { user_id: 'p2' }, { user_id: 'p3' }, { user_id: 'p4' }]) })),
}))

import MatchSessionView from './MatchSessionView.vue'

describe('MatchSessionView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the session + rounds and shows standings', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getSession).toHaveBeenCalledWith('ms1')
    expect(listRoundsWithMatches).toHaveBeenCalledWith('ms1')
    expect(wrapper.text()).toContain('Standings')
    expect(computeStandingsFor).toHaveBeenCalled()
  })

  it('generate-next-round button calls generateRound with the confirmed players', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    const btn = wrapper.find('[data-testid="generate-round-btn"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await flushPromises()

    expect(generateRound).toHaveBeenCalled()
    const input = generateRound.mock.calls[0][1]
    expect(input.playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchSessionView`
Expected: FAIL — view does not exist.

- [ ] **Step 3: Implement**

`src/views/matches/MatchSessionView.vue`:
```vue
<template>
  <section v-if="session" class="match-session-view">
    <div class="match-session-view__header">
      <h1>Match session</h1>
      <LiBadge :label="session.format" variant="brand" />
      <LiBadge :label="session.status" :variant="statusVariant(session.status)" />
    </div>

    <div class="match-session-view__actions">
      <LiButton data-testid="generate-round-btn" @click="handleGenerateRound">Generate next round</LiButton>
    </div>

    <div v-for="round in rounds" :key="round.id" class="match-session-view__round">
      <h3>Round {{ round.round_number + 1 }}</h3>
      <ul>
        <li v-for="m in round.matches" :key="m.id" class="match-session-view__match">
          <span>Court {{ m.court_number }}: {{ m.team_a.join(' / ') }} vs {{ m.team_b.join(' / ') }}</span>
          <span v-if="m.status === 'completed'" class="match-session-view__score">{{ m.score_a }}-{{ m.score_b }}</span>
          <div v-else class="match-session-view__score-entry">
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
            <LiButton size="sm" @click="handleFinalize(m)">Finalize</LiButton>
          </div>
        </li>
      </ul>
    </div>

    <div class="match-session-view__standings">
      <h2>Standings</h2>
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
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiButton, LiBadge, useToast } from '../../design-system/components/index.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import { useMatchRounds } from '../../composables/useMatchRounds.js'
import { useMatchScoring } from '../../composables/useMatchScoring.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const route = useRoute()
const toast = useToast()
const { getSession, generateRound: _unused, setStatus } = useMatchSessions()
const { generateRound, listRoundsWithMatches } = useMatchRounds()
const { enterScore, finalizeMatch, computeStandingsFor } = useMatchScoring()
const { listParticipants } = useMeetParticipants()

const session = ref(null)
const rounds = ref([])
const participants = ref([])
const scoreCache = reactive({})

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
  try {
    session.value = await getSession(route.params.sessionId)
    participants.value = await listParticipants(route.params.meetId)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load the match session.')
  }
})

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
.match-session-view__header { display: flex; align-items: center; gap: var(--space-s, 8px); }
.match-session-view__round ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.match-session-view__match { display: flex; align-items: center; gap: var(--space-s, 8px); flex-wrap: wrap; }
.match-session-view__score-entry { display: flex; align-items: center; gap: var(--space-xs, 4px); }
.match-session-view__score-input { width: 56px; padding: var(--space-xs, 4px); border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px); }
.match-session-view__standings table { width: 100%; border-collapse: collapse; }
.match-session-view__standings th, .match-session-view__standings td { padding: var(--space-s, 8px); text-align: left; border-bottom: 1px solid var(--color-gray-200, #E6E6E6); }
</style>
```

NOTE: the destructured `generateRound: _unused` from `useMatchSessions` is a deliberate no-op guard — `useMatchSessions` does NOT export `generateRound` (that's `useMatchRounds`). Remove that token; only destructure what `useMatchSessions` actually returns: `const { getSession, setStatus } = useMatchSessions()`. (The line above is corrected in the final code you write — do NOT destructure `generateRound` from useMatchSessions.)

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add before the catch-all:
```js
    { path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: () => import('../views/matches/MatchSessionView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 5: Run the FULL suite + build**

`npm test 2>&1 | tail -12` → expect green.
`npm run build 2>&1 | tail -6` → expect exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/views/matches/MatchSessionView.vue src/views/matches/MatchSessionView.spec.js src/router/index.js
git commit -m "feat(p4): add MatchSessionView — generate rounds, score, finalize, standings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** §4 Match Engine — Americano/Mexicano/Team Americano/Singles generators ✓ (Task 1), courts ✓ (court_number per match), live scoring ✓ (enterScore + finalize UI, Task 5), standings ✓ (computeStandings by 4 criteria), skill rating (Elo) ✓ (apply_match_result RPC, Task 4). Reliability + share-image + TV mode deferred (4b).

**Placeholder scan:** none — every step has verbatim code. (Task 5's `generateRound: _unused` note is an explicit correction instruction, not a placeholder.)

**Type consistency:** `generateRound(session, input, roundIndex)` — `input.playerIds` for americano/mexicano/singles, `input.teams` for team_americano. MatchSessionView passes `{ playerIds }` (americano path). `computeStandingsFor(rounds, playerIds, criteria)` flattens rounds. `finalizeMatch(matchId)` → rpc `apply_match_result` with `{ p_match_id }` — matches the SQL param name `p_match_id uuid`.

**Deferred (4b):** share-match-result image, TV/big-screen mode, `prioritize_least_matches` greedy optimization (V1 rotation is fair-enough), reliability score (attendance-based, Phase 3), multi-session meet UI polish.
