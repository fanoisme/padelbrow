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
