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
