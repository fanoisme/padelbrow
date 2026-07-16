# Meet/Match Dedupe + Add Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Meet Detail "Matches" tab from creating a duplicate `match_sessions` row every time it's opened, and let an organizer add an existing club member or a nameless guest directly into a meet and its match rounds.

**Architecture:** A small additive migration makes `meet_participants.user_id` and `match_players.user_id` nullable and adds `guest_name` / `guest_participant_id` columns so a "participant" row can represent either a real user or a guest with no account. Round generation and the Meet/Match views key everything off `meet_participants.id` (always present) instead of `user_id` (only present for real users). No existing RLS policy needs to change — verified during design that the current organizer-permissive policies already cover guest rows.

**Tech Stack:** Vue 3 `<script setup>`, Supabase (Postgres + supabase-js), Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-07-16-meet-match-add-player-design.md`

---

## Task 1: Migration — nullable identities + guest columns

**Files:**
- Create: `supabase/migrations/20260716120000_meet_guest_players.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Allow a meet_participants row to represent a guest (no account): user_id
-- becomes optional, guest_name fills in for a guest. Exactly one of the two
-- must be set.
alter table public.meet_participants
  alter column user_id drop not null;

alter table public.meet_participants
  add column guest_name text;

alter table public.meet_participants
  add constraint meet_participants_identity_check
    check ((user_id is not null) <> (guest_name is not null));

-- match_players needs the same treatment so a guest can be assigned into a
-- match. Since a guest has no profiles row, guest players are referenced via
-- their meet_participants row instead of user_id. The old composite primary
-- key (match_id, user_id) can't represent a null user_id, so replace it with
-- a surrogate id + two per-identity unique constraints (Postgres unique
-- constraints ignore rows where the constrained column is null, so a real
-- player and a guest can each have their own uniqueness guarantee without
-- colliding).
alter table public.match_players drop constraint match_players_pkey;

alter table public.match_players
  add column id uuid primary key default gen_random_uuid();

alter table public.match_players
  alter column user_id drop not null;

alter table public.match_players
  add column guest_participant_id uuid references public.meet_participants(id) on delete cascade;

alter table public.match_players
  add constraint match_players_identity_check
    check ((user_id is not null) <> (guest_participant_id is not null));

alter table public.match_players
  add constraint match_players_match_user_unique unique (match_id, user_id);

alter table public.match_players
  add constraint match_players_match_guest_unique unique (match_id, guest_participant_id);
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: migration applies with no errors (if you don't have a linked local/remote Supabase project to test against, skip this step and note it — the SQL will still be reviewed and applied by CI/the real project on merge).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716120000_meet_guest_players.sql
git commit -m "feat(db): allow guest players via nullable user_id + guest columns"
```

---

## Task 2: `useMeetParticipants.js` — add existing member / add guest / list club members

**Files:**
- Modify: `src/composables/useMeetParticipants.js`
- Test: `src/composables/useMeetParticipants.spec.js`

- [ ] **Step 1: Write the failing tests**

Add these `it(...)` blocks inside the existing `describe('useMeetParticipants', ...)` in `src/composables/useMeetParticipants.spec.js` (after the last `promoteNext` test, before the closing `})`):

```js
  it('addExistingMember inserts the given user as confirmed and records who added them', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 2, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p9', status: 'confirmed' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addExistingMember } = useMeetParticipants()
    const result = await addExistingMember({ id: 'm1', max_players: 4 }, 'u5', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', user_id: 'u5', invited_by: 'u1', status: 'confirmed' })
    expect(result).toEqual({ id: 'p9', status: 'confirmed' })
  })

  it('addExistingMember waitlists when the meet is at capacity', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 4, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p9', status: 'waitlisted' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addExistingMember } = useMeetParticipants()
    const result = await addExistingMember({ id: 'm1', max_players: 4 }, 'u5', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', user_id: 'u5', invited_by: 'u1', status: 'waitlisted' })
    expect(result).toEqual({ id: 'p9', status: 'waitlisted' })
  })

  it('addGuest inserts a guest_name row (no user_id) as confirmed', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 1, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p10', status: 'confirmed', guest_name: 'Bambang' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addGuest } = useMeetParticipants()
    const result = await addGuest({ id: 'm1', max_players: 4 }, 'Bambang', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', guest_name: 'Bambang', invited_by: 'u1', status: 'confirmed' })
    expect(result).toEqual({ id: 'p10', status: 'confirmed', guest_name: 'Bambang' })
  })

  it('listClubMembersNotInMeet returns club members minus existing participants', async () => {
    const membersEq = vi.fn().mockResolvedValue({
      data: [
        { user_id: 'u1', profiles: { id: 'u1', full_name: 'Fano', avatar_url: null } },
        { user_id: 'u5', profiles: { id: 'u5', full_name: 'Rani', avatar_url: null } },
      ],
      error: null,
    })
    const membersSelect = vi.fn(() => ({ eq: membersEq }))

    const existingEq = vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }], error: null })
    const existingSelect = vi.fn(() => ({ eq: existingEq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'club_members') return { select: membersSelect }
      if (table === 'meet_participants') return { select: existingSelect }
      throw new Error(`unexpected table ${table}`)
    })

    const { listClubMembersNotInMeet } = useMeetParticipants()
    const result = await listClubMembersNotInMeet('m1', 'c1')

    expect(membersEq).toHaveBeenCalledWith('club_id', 'c1')
    expect(existingEq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(result).toEqual([{ id: 'u5', full_name: 'Rani', avatar_url: null }])
  })

  it('listClubMembersNotInMeet returns an empty list when the meet has no club', async () => {
    const { listClubMembersNotInMeet } = useMeetParticipants()
    const result = await listClubMembersNotInMeet('m1', null)
    expect(result).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/composables/useMeetParticipants.spec.js`
Expected: FAIL — `addExistingMember is not a function` (and similar for `addGuest`, `listClubMembersNotInMeet`).

- [ ] **Step 3: Implement**

Replace the full contents of `src/composables/useMeetParticipants.js` with:

```js
import { supabase } from '../lib/supabase.js'

export function useMeetParticipants() {
  async function listParticipants(meetId) {
    const { data, error } = await supabase
      .from('meet_participants')
      .select('id, user_id, guest_name, role, status, joined_at, payment_status, profiles!meet_participants_user_id_fkey(id, full_name, avatar_url)')
      .eq('meet_id', meetId)
      .order('joined_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function countConfirmed(meetId) {
    const { count, error } = await supabase
      .from('meet_participants')
      .select('id', { count: 'exact', head: true })
      .eq('meet_id', meetId)
      .eq('status', 'confirmed')
    if (error) throw error
    return count ?? 0
  }

  async function insertRow(meetId, row) {
    const { data, error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, role: 'player', ...row })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function joinWithCapacity(meet, row) {
    const confirmed = await countConfirmed(meet.id)
    const preferred = confirmed < (meet.max_players ?? 4) ? 'confirmed' : 'waitlisted'
    try {
      return await insertRow(meet.id, { ...row, status: preferred })
    } catch (err) {
      // Race: another user took the last confirmed slot between our count and
      // insert (the DB capacity trigger rejected the over-fill). Fall back to
      // waitlisted rather than surfacing a capacity error to the user.
      if (preferred === 'confirmed') {
        return await insertRow(meet.id, { ...row, status: 'waitlisted' })
      }
      throw err
    }
  }

  async function joinMeet(meet, userId) {
    return joinWithCapacity(meet, { user_id: userId })
  }

  async function addExistingMember(meet, userId, addedBy) {
    return joinWithCapacity(meet, { user_id: userId, invited_by: addedBy })
  }

  async function addGuest(meet, guestName, addedBy) {
    return joinWithCapacity(meet, { guest_name: guestName, invited_by: addedBy })
  }

  async function listClubMembersNotInMeet(meetId, clubId) {
    if (!clubId) return []

    const { data: members, error: membersError } = await supabase
      .from('club_members')
      .select('user_id, profiles(id, full_name, avatar_url)')
      .eq('club_id', clubId)
    if (membersError) throw membersError

    const { data: existing, error: existingError } = await supabase
      .from('meet_participants')
      .select('user_id')
      .eq('meet_id', meetId)
    if (existingError) throw existingError

    const existingIds = new Set((existing || []).map((p) => p.user_id).filter(Boolean))
    return (members || [])
      .filter((m) => !existingIds.has(m.user_id))
      .map((m) => m.profiles)
  }

  async function leaveMeet(meetId, userId) {
    // Capture the row before deleting so we know if a vacancy opens up.
    const { data: existing, error: findErr } = await supabase
      .from('meet_participants')
      .select('status')
      .eq('meet_id', meetId)
      .eq('user_id', userId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!existing) return

    const { error: delErr } = await supabase
      .from('meet_participants')
      .delete()
      .eq('meet_id', meetId)
      .eq('user_id', userId)
    if (delErr) throw delErr

    if (existing.status === 'confirmed') {
      await promoteNext(meetId)
    }
  }

  async function promoteNext(meetId) {
    // Server-side atomic promotion via SECURITY DEFINER RPC: only promotes if
    // confirmed < max_players, and runs as the table owner so a non-creator
    // leaver can promote another user's waitlisted row (the tightened update
    // policy otherwise blocks that). Returns the promoted row or null.
    const { data, error } = await supabase.rpc('promote_next_meet_participant', { p_meet_id: meetId })
    if (error) throw error
    return data
  }

  async function inviteUser(meetId, inviteeId, invitedById) {
    const { error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, user_id: inviteeId, role: 'player', status: 'invited', invited_by: invitedById })
    if (error) throw error
  }

  return {
    listParticipants,
    joinMeet,
    leaveMeet,
    promoteNext,
    inviteUser,
    addExistingMember,
    addGuest,
    listClubMembersNotInMeet,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/composables/useMeetParticipants.spec.js`
Expected: PASS (all tests, including the pre-existing `joinMeet`/`promoteNext` ones — the refactor keeps their exact insert payloads).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useMeetParticipants.js src/composables/useMeetParticipants.spec.js
git commit -m "feat(meets): add addExistingMember/addGuest/listClubMembersNotInMeet"
```

---

## Task 3: `useMatchRounds.js` — persist guest players into match_players

**Files:**
- Modify: `src/composables/useMatchRounds.js`
- Test: `src/composables/useMatchRounds.spec.js`

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/composables/useMatchRounds.spec.js` with:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/matchFormatGenerators.js', () => ({
  generateAmericanoRound: vi.fn(() => [
    { court: 1, team_a: ['p1', 'p2'], team_b: ['p3', 'p4'] },
  ]),
  generateMexicanoRound: vi.fn(),
  generateTeamAmericanoRound: vi.fn(),
  generateTeamMexicanoRound: vi.fn(),
  generateSinglesRound: vi.fn(),
}))

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { generateAmericanoRound } from '../lib/matchFormatGenerators.js'
import { useMatchRounds } from './useMatchRounds.js'

describe('useMatchRounds', () => {
  beforeEach(() => vi.clearAllMocks())

  const participants = [
    { id: 'p1', user_id: 'u1' },
    { id: 'p2', user_id: 'u2' },
    { id: 'p3', guest_name: 'Bambang' }, // guest — no user_id
    { id: 'p4', user_id: 'u4' },
  ]

  function mockPersistence() {
    const roundSingle = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null })
    const roundSelect = vi.fn(() => ({ single: roundSingle }))
    const roundInsert = vi.fn(() => ({ select: roundSelect }))

    const matchesSelect = vi.fn().mockResolvedValue({ data: [{ id: 'm1', court_number: 1, match_round_id: 'r1' }], error: null })
    const matchesInsert = vi.fn(() => ({ select: matchesSelect }))

    const playersInsert = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'match_rounds') return { insert: roundInsert }
      if (table === 'matches') return { insert: matchesInsert }
      if (table === 'match_players') return { insert: playersInsert }
      return {}
    })

    return { roundInsert, matchesInsert, playersInsert }
  }

  it('generateRound persists a round + matches + players for americano, mapping guests to guest_participant_id', async () => {
    const { roundInsert, matchesInsert, playersInsert } = mockPersistence()

    const { generateRound } = useMatchRounds()
    const result = await generateRound(
      { id: 'ms1', format: 'americano' },
      { playerIds: ['p1', 'p2', 'p3', 'p4'] },
      0,
      participants
    )

    expect(generateAmericanoRound).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'], 0, [])
    expect(roundInsert).toHaveBeenCalledWith({ match_session_id: 'ms1', round_number: 0, status: 'pending' })
    expect(matchesInsert).toHaveBeenCalledWith([{ match_round_id: 'r1', court_number: 1, status: 'pending' }])
    expect(playersInsert).toHaveBeenCalledWith([
      { match_id: 'm1', team: 'a', user_id: 'u1' },
      { match_id: 'm1', team: 'a', user_id: 'u2' },
      { match_id: 'm1', team: 'b', guest_participant_id: 'p3' },
      { match_id: 'm1', team: 'b', user_id: 'u4' },
    ])
    expect(result).toHaveLength(1)
  })

  it('generateRound throws for an unsupported format', async () => {
    const { generateRound } = useMatchRounds()
    await expect(generateRound({ id: 'ms1', format: 'doubles' }, { playerIds: ['p1'] }, 0, [])).rejects.toThrow(/unsupported format/)
  })

  it('generateRound throws if a generated player id has no matching participant', async () => {
    mockPersistence()
    const { generateRound } = useMatchRounds()
    await expect(
      generateRound({ id: 'ms1', format: 'americano' }, { playerIds: ['p1', 'p2', 'p3', 'p4'] }, 0, [])
    ).rejects.toThrow(/unknown participant/i)
  })

  it('listRoundsWithMatches resolves guest players by guest_participant_id', async () => {
    const roundsOrder = vi.fn().mockResolvedValue({ data: [{ id: 'r1', round_number: 0, status: 'pending' }], error: null })
    const roundsEq = vi.fn(() => ({ order: roundsOrder }))
    const roundsSelect = vi.fn(() => ({ eq: roundsEq }))

    const matchesOrder = vi.fn().mockResolvedValue({
      data: [{
        id: 'm1',
        court_number: 1,
        match_players: [
          { match_id: 'm1', user_id: 'u1', guest_participant_id: null, team: 'a' },
          { match_id: 'm1', user_id: null, guest_participant_id: 'p3', team: 'b' },
        ],
      }],
      error: null,
    })
    const matchesEq = vi.fn(() => ({ order: matchesOrder }))
    const matchesSelect = vi.fn(() => ({ eq: matchesEq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'match_rounds') return { select: roundsSelect }
      if (table === 'matches') return { select: matchesSelect }
      return {}
    })

    const { listRoundsWithMatches } = useMatchRounds()
    const result = await listRoundsWithMatches('ms1')

    expect(result[0].matches[0].team_a).toEqual(['u1'])
    expect(result[0].matches[0].team_b).toEqual(['p3'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/composables/useMatchRounds.spec.js`
Expected: FAIL — the "guest_participant_id" assertions don't match today's output (current code always writes `user_id: pid`), and `generateRound` doesn't yet throw for unknown participants.

- [ ] **Step 3: Implement**

Replace the full contents of `src/composables/useMatchRounds.js` with:

```js
import { supabase } from '../lib/supabase.js'
import {
  generateAmericanoRound,
  generateMexicanoRound,
  generateTeamAmericanoRound,
  generateTeamMexicanoRound,
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
    case 'team_mexicano':
      return generateTeamMexicanoRound(input.teams, roundIndex, input.history || [])
    case 'singles':
      return generateSinglesRound(input.playerIds, roundIndex, input.history || [])
    default:
      throw new Error(`unsupported format: ${format}`)
  }
}

// Round generators work on opaque participant ids (meet_participants.id).
// A real player's identity in match_players is their profiles.id (user_id);
// a guest has no profiles row, so they're referenced by their
// meet_participants row instead (guest_participant_id).
function identityFor(participant, pid) {
  if (!participant) throw new Error(`Unknown participant id in round: ${pid}`)
  return participant.user_id
    ? { user_id: participant.user_id }
    : { guest_participant_id: participant.id }
}

export function useMatchRounds() {
  async function generateRound(session, input, roundIndex, participants) {
    const roundMatches = generateForFormat(session.format, input, roundIndex)
    if (roundMatches.length === 0) return []

    const byId = new Map(participants.map((p) => [p.id, p]))

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
      for (const pid of m.team_a) playerRows.push({ match_id: matchId, team: 'a', ...identityFor(byId.get(pid), pid) })
      for (const pid of m.team_b) playerRows.push({ match_id: matchId, team: 'b', ...identityFor(byId.get(pid), pid) })
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
        .select('*, match_players(match_id, user_id, guest_participant_id, team)')
        .eq('match_round_id', round.id)
        .order('court_number', { ascending: true })
      if (matchError) throw matchError
      result.push({
        ...round,
        matches: (matches || []).map((m) => ({
          ...m,
          team_a: (m.match_players || []).filter((p) => p.team === 'a').map((p) => p.user_id || p.guest_participant_id),
          team_b: (m.match_players || []).filter((p) => p.team === 'b').map((p) => p.user_id || p.guest_participant_id),
        })),
      })
    }
    return result
  }

  return { generateRound, listRoundsWithMatches }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/composables/useMatchRounds.spec.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useMatchRounds.js src/composables/useMatchRounds.spec.js
git commit -m "feat(matches): persist guest players via guest_participant_id"
```

---

## Task 4: `MatchSessionView.vue` — key player lookups off participant id, not user_id

**Files:**
- Modify: `src/views/matches/MatchSessionView.vue:180-185, 245-259, 268-277`
- Test: `src/views/matches/MatchSessionView.spec.js`

- [ ] **Step 1: Write the failing test**

In `src/views/matches/MatchSessionView.spec.js`, change the `useMeetParticipants` mock (around line 32-37) from:

```js
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({
    listParticipants: vi.fn().mockResolvedValue([{ user_id: 'p1' }, { user_id: 'p2' }, { user_id: 'p3' }, { user_id: 'p4' }]),
    joinMeet: vi.fn().mockResolvedValue(undefined),
  })),
}))
```

to:

```js
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({
    listParticipants: vi.fn().mockResolvedValue([
      { id: 'p1', user_id: 'p1', profiles: { full_name: 'Alpha' } },
      { id: 'p2', user_id: 'p2', profiles: { full_name: 'Bravo' } },
      { id: 'p3', user_id: 'p3', profiles: { full_name: 'Charlie' } },
      { id: 'p4', user_id: null, guest_name: 'Delta (guest)' },
    ]),
    joinMeet: vi.fn().mockResolvedValue(undefined),
  })),
}))
```

Then add this new test at the end of the `describe('MatchSessionView', ...)` block, right before the final closing `})`:

```js
  it('renders a guest participant using guest_name and passes participants into generateRound', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Delta (guest)')

    const btn = wrapper.find('[data-testid="generate-round-btn"]')
    await btn.trigger('click')
    await flushPromises()

    const participantsArg = generateRound.mock.calls[0][3]
    expect(participantsArg.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: FAIL — `wrapper.text()` doesn't contain "Delta (guest)" (current code renders `name(id)` off `user_id`, and a guest's `user_id` is `null`, so `playerById` has no entry for the guest's team slot at all); `generateRound.mock.calls[0][3]` is `undefined`.

- [ ] **Step 3: Implement**

In `src/views/matches/MatchSessionView.vue`, replace lines 180-185:

```js
const playerById = computed(() => {
  const m = new Map()
  for (const p of participants.value) m.set(p.user_id, p.profiles || {})
  return m
})
const playerIds = computed(() => participants.value.map((p) => p.user_id))
```

with:

```js
const playerById = computed(() => {
  const m = new Map()
  for (const p of participants.value) {
    m.set(p.id, { full_name: p.profiles?.full_name || p.guest_name, avatar_url: p.profiles?.avatar_url || '' })
  }
  return m
})
const playerIds = computed(() => participants.value.map((p) => p.id))
```

Then replace the `handleGenerateRound` function (currently around line 268-277):

```js
async function handleGenerateRound() {
  try {
    const nextRound = rounds.value.length
    await generateRound(session.value, buildRoundInput(session.value.format, playerIds.value), nextRound)
    await reload()
    toast.success('Round generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate the round.')
  }
}
```

with:

```js
async function handleGenerateRound() {
  try {
    const nextRound = rounds.value.length
    await generateRound(session.value, buildRoundInput(session.value.format, playerIds.value), nextRound, participants.value)
    await reload()
    toast.success('Round generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate the round.')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/views/matches/MatchSessionView.spec.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/matches/MatchSessionView.vue src/views/matches/MatchSessionView.spec.js
git commit -m "feat(matches): resolve player display + round generation by participant id"
```

---

## Task 5: `MeetDetailView.vue` — stop duplicate sessions + Add Player sheet

**Files:**
- Modify: `src/views/meets/MeetDetailView.vue`
- Test: `src/views/meets/MeetDetailView.spec.js`

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/views/meets/MeetDetailView.spec.js` with:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'm1', title: 'Tue Night', creator_id: 'u1', club_id: null, max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

const listParticipants = vi.fn().mockResolvedValue([
  { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
])
const joinMeet = vi.fn().mockResolvedValue({ id: 'p2', status: 'confirmed' })
const leaveMeet = vi.fn().mockResolvedValue()
const addExistingMember = vi.fn().mockResolvedValue({ id: 'p9', status: 'confirmed' })
const addGuest = vi.fn().mockResolvedValue({ id: 'p10', status: 'confirmed' })
const listClubMembersNotInMeet = vi.fn().mockResolvedValue([{ id: 'u5', full_name: 'Rani' }])
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants, joinMeet, leaveMeet, addExistingMember, addGuest, listClubMembersNotInMeet })),
}))

const listSessionsByMeet = vi.fn().mockResolvedValue([])
vi.mock('../../composables/useMatchSessions.js', () => ({
  useMatchSessions: vi.fn(() => ({ listSessionsByMeet })),
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

function mountWithRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/meets/:id', name: 'meet-detail', component: MeetDetailView },
      { path: '/meets/:meetId/match-session/:sessionId?', name: 'match-session', component: { template: '<div>stub match session</div>' } },
    ],
  })
  router.push('/meets/m1')
  return router
}

describe('MeetDetailView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the meet + participants and shows Join for a non-participant', async () => {
    listParticipants.mockResolvedValueOnce([
      { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
    ])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getMeet).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })

  it('drives the create wizard when no match session exists yet', async () => {
    listSessionsByMeet.mockResolvedValueOnce([])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const matchBtn = wrapper.findAll('button').find((b) => b.text().match(/open match session/i))
    expect(matchBtn).toBeTruthy()
    await matchBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/meets/m1/match-session')
  })

  it('opens the most recent existing session instead of creating a new one', async () => {
    listSessionsByMeet.mockResolvedValueOnce([
      { id: 's2', format: 'americano', num_courts: 1, status: 'setup', created_at: '2026-07-15T10:00:00Z' },
      { id: 's1', format: 'americano', num_courts: 1, status: 'completed', created_at: '2026-07-14T10:00:00Z' },
    ])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const matchBtn = wrapper.findAll('button').find((b) => b.text().match(/^open match session$/i))
    expect(matchBtn).toBeTruthy()
    await matchBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/meets/m1/match-session/s2')
  })

  it('organizer can add an existing club member via the Add player sheet', async () => {
    getMeet.mockResolvedValueOnce({ id: 'm1', title: 'Tue Night', creator_id: 'u2', club_id: 'c1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    expect(addBtn).toBeTruthy()
    await addBtn.trigger('click')
    await flushPromises()

    expect(listClubMembersNotInMeet).toHaveBeenCalledWith('m1', 'c1')
    const memberTile = wrapper.findAll('[data-testid="add-player-member"]').find((t) => t.text().includes('Rani'))
    expect(memberTile).toBeTruthy()
    await memberTile.trigger('click')
    await flushPromises()

    expect(addExistingMember).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'u5', 'u2')
  })

  it('organizer can add a guest by name via the Add player sheet', async () => {
    getMeet.mockResolvedValueOnce({ id: 'm1', title: 'Tue Night', creator_id: 'u2', club_id: null, max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    await addBtn.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="guest-name-input"] input').setValue('Bambang')
    const guestBtn = wrapper.find('[data-testid="add-guest-btn"]')
    await guestBtn.trigger('click')
    await flushPromises()

    expect(addGuest).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'Bambang', 'u2')
  })

  it('non-organizer does not see the Add player button', async () => {
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    expect(addBtn).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: FAIL — no `useMatchSessions` mock consumed today (session list defaults from a real failed network call, so the dedupe test can't control it), no "+ Add player" button exists yet.

- [ ] **Step 3: Implement**

In `src/views/meets/MeetDetailView.vue`, replace the "Matches" tab block (currently lines 40-62):

```html
      <!-- Matches -->
      <div v-show="activeTab === 3" class="meet-detail-view__matches">
        <LiButton variant="secondary" @click="goToMatches">+ New match session</LiButton>
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
            <LiButton @click="goToMatches">Open match session</LiButton>
          </template>
        </LiEmptyState>
      </div>
```

with:

```html
      <!-- Matches -->
      <div v-show="activeTab === 3" class="meet-detail-view__matches">
        <div class="meet-detail-view__matches-actions">
          <LiButton variant="secondary" @click="goToMatches">{{ sessions.length ? 'Open match session' : '+ New match session' }}</LiButton>
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
            <LiButton @click="goToMatches">Open match session</LiButton>
          </template>
        </LiEmptyState>
      </div>
```

Next, replace the "Participants" tab block (currently lines 23-32):

```html
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
```

with:

```html
      <!-- Participants -->
      <div v-show="activeTab === 1">
        <LiButton v-if="isOrganizer" variant="secondary" size="sm" @click="openAddPlayer">+ Add player</LiButton>
        <LiCard flush>
          <LiListTile v-for="p in participants" :key="p.id" :title="p.profiles?.full_name || p.guest_name">
            <template #trailing>
              <LiBadge v-if="!p.user_id" label="Guest" variant="neutral" />
              <LiBadge v-else :label="p.status" :variant="statusVariant(p.status)" />
            </template>
          </LiListTile>
        </LiCard>
      </div>
```

Now add the Add Player bottom sheet just before the closing `</section>` tag (after the Chat tab `</div>` at what is currently line 67, so right after that closing `</div>` and before the final `</section>`):

```html
    <LiBottomSheet v-model="showAddPlayer" title="Add player">
      <div class="add-player-sheet">
        <section v-if="meet.club_id">
          <h4 class="add-player-sheet__label">Club members</h4>
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
        </section>

        <section class="add-player-sheet__guest">
          <h4 class="add-player-sheet__label">Add a guest</h4>
          <LiTextField v-model="guestName" placeholder="Guest name" data-testid="guest-name-input" />
          <LiButton :disabled="!guestName.trim()" data-testid="add-guest-btn" @click="handleAddGuest">Add guest</LiButton>
        </section>
      </div>
    </LiBottomSheet>
```

Update the `<script setup>` imports and add the new state/functions. Replace:

```js
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiPageHeader, useToast } from '../../design-system/components/index.js'
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
const { listParticipants, joinMeet, leaveMeet } = useMeetParticipants()
const { listSessionsByMeet } = useMatchSessions()
const toast = useToast()
```

with:

```js
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, LiCard, LiListTile, LiPageHeader, LiBottomSheet, LiTextField, LiIcon, useToast } from '../../design-system/components/index.js'
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
const { listParticipants, joinMeet, leaveMeet, addExistingMember, addGuest, listClubMembersNotInMeet } = useMeetParticipants()
const { listSessionsByMeet } = useMatchSessions()
const toast = useToast()

const showAddPlayer = ref(false)
const clubMembersToAdd = ref([])
const guestName = ref('')
```

Replace the existing `goToMatches`/`openSession` functions:

```js
function goToMatches() {
  router.push({ name: 'match-session', params: { meetId: route.params.id } })
}

function openSession(sessionId) {
  router.push({ name: 'match-session', params: { meetId: route.params.id, sessionId } })
}
```

with:

```js
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
  try {
    clubMembersToAdd.value = meet.value?.club_id
      ? await listClubMembersNotInMeet(meet.value.id, meet.value.club_id)
      : []
  } catch (err) {
    toast.error(err.message || 'Could not load club members.')
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
```

Finally add the two new CSS rules to the `<style scoped>` block (append after `.meet-detail-view__matches`):

```css
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/views/meets/MeetDetailView.spec.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/meets/MeetDetailView.vue src/views/meets/MeetDetailView.spec.js
git commit -m "fix(meets): stop duplicate match sessions, add invite/guest UI"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, no regressions in unrelated files (stats, leaderboard, gamification composables are untouched by this change).

- [ ] **Step 2: Manual smoke test in the browser**

Run: `npm run dev`, then in the browser:
1. Create a new meet → confirm it lands directly on a match session (no duplicate creation).
2. Go back to the meet's Matches tab → click "Open match session" → confirm it opens the *same* session (not a fresh wizard).
3. Click "+ Start another session" → confirm a second session is created and listed.
4. Go to the meet's Participants tab as the organizer → click "+ Add player" → add a guest by name → confirm they appear in the participant list with a "Guest" badge.
5. If the meet belongs to a club, confirm the club members list in the Add Player sheet excludes people already in the meet, and adding one confirms them.
6. Open the match session, generate a round → confirm the guest's name renders correctly on their team slot (no crash, no blank avatar issue).

- [ ] **Step 3: Commit (only if smoke testing surfaced fixes)**

If manual testing found no issues, no commit needed here — Task 5's commit is the final one.
