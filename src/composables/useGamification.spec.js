import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../lib/supabase.js'
import { useGamification } from './useGamification.js'

function chain(resolved) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    lte: vi.fn(() => self),
    gte: vi.fn(() => self),
    order: vi.fn(() => self),
    then: (resolve) => resolve(resolved),
  }
  return self
}

describe('useGamification', () => {
  beforeEach(() => supabase.from.mockReset())

  it('getMyProgress sums XP + picks level + next threshold', async () => {
    supabase.from
      .mockReturnValueOnce(chain({ data: [{ amount: 100 }, { amount: 450 }], error: null }))
      .mockReturnValueOnce(chain({ data: [
        { level: 1, title: 'Rookie', min_xp: 0 },
        { level: 2, title: 'Amateur', min_xp: 500 },
        { level: 3, title: 'Pro', min_xp: 2000 },
      ], error: null }))
    const { getMyProgress } = useGamification()
    const p = await getMyProgress('u1')
    expect(p.totalXp).toBe(550)
    expect(p.level.level).toBe(2)
    expect(p.nextLevel.level).toBe(3)
    expect(p.nextMinXp).toBe(2000)
  })

  it('getMyProgress nulls nextLevel when maxed', async () => {
    supabase.from
      .mockReturnValueOnce(chain({ data: [{ amount: 6000 }], error: null }))
      .mockReturnValueOnce(chain({ data: [
        { level: 1, title: 'Rookie', min_xp: 0 },
        { level: 4, title: 'Legend', min_xp: 5000 },
      ], error: null }))
    const { getMyProgress } = useGamification()
    const p = await getMyProgress('u1')
    expect(p.level.level).toBe(4)
    expect(p.nextLevel).toBeNull()
    expect(p.nextMinXp).toBeNull()
  })

  it('getAchievements orders by tier then name', async () => {
    const c = chain({ data: [{ key: 'first_match', tier: 'bronze' }], error: null })
    supabase.from.mockReturnValue(c)
    const { getAchievements } = useGamification()
    const rows = await getAchievements()
    expect(supabase.from).toHaveBeenCalledWith('achievements')
    expect(c.order).toHaveBeenCalledWith('tier', { ascending: true })
    expect(rows[0].key).toBe('first_match')
  })

  it('getMyUnlocked returns a Set of achievement ids', async () => {
    const c = chain({ data: [{ achievement_id: 'a1' }, { achievement_id: 'a2' }], error: null })
    supabase.from.mockReturnValue(c)
    const { getMyUnlocked } = useGamification()
    const set = await getMyUnlocked('u1')
    expect(set).toBeInstanceOf(Set)
    expect(set.has('a1')).toBe(true)
  })

  it('getActiveChallenges filters by window', async () => {
    const c = chain({ data: [{ key: 'play_3_weekly' }], error: null })
    supabase.from.mockReturnValue(c)
    const { getActiveChallenges } = useGamification()
    const rows = await getActiveChallenges()
    expect(supabase.from).toHaveBeenCalledWith('challenges')
    expect(c.lte).toHaveBeenCalledWith('starts_at', expect.any(String))
    expect(c.gte).toHaveBeenCalledWith('ends_at', expect.any(String))
    expect(rows[0].key).toBe('play_3_weekly')
  })

  it('throws on error', async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: 'boom' } }))
    const { getAchievements } = useGamification()
    await expect(getAchievements()).rejects.toThrow('boom')
  })
})
