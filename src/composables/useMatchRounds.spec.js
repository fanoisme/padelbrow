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

    const { generateRound } = useMatchRounds()
    const result = await generateRound(
      { id: 'ms1', format: 'americano' },
      { playerIds: ['p1', 'p2', 'p3', 'p4'] },
      0
    )

    expect(generateAmericanoRound).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'], 0, [])
    expect(roundInsert).toHaveBeenCalledWith({ match_session_id: 'ms1', round_number: 0, status: 'pending' })
    expect(matchesInsert).toHaveBeenCalledWith([{ match_round_id: 'r1', court_number: 1, status: 'pending' }])
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
