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
