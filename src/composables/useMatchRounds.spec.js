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

  it('listRoundsWithMatches resolves both real and guest players to their participant id', async () => {
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

    // Note: this participant's `id` ('p1') deliberately differs from their
    // `user_id` ('u1') — matching production, where meet_participants.id is
    // its own independent uuid, never equal to profiles.id.
    const { listRoundsWithMatches } = useMatchRounds()
    const result = await listRoundsWithMatches('ms1', [
      { id: 'p1', user_id: 'u1' },
      { id: 'p3', guest_name: 'Bambang' },
    ])

    expect(result[0].matches[0].team_a).toEqual(['p1'])
    expect(result[0].matches[0].team_b).toEqual(['p3'])
  })
})
