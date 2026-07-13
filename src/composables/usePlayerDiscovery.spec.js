import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { usePlayerDiscovery } from './usePlayerDiscovery.js'

describe('usePlayerDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes the current user and anyone they have blocked, applies level/area filters', async () => {
    const blocksEq = vi.fn().mockResolvedValue({ data: [{ blocked_id: 'u3' }], error: null })
    const blocksSelect = vi.fn(() => ({ eq: blocksEq }))

    const order = vi.fn().mockResolvedValue({ data: [{ id: 'u2', full_name: 'Rina' }], error: null })
    const not = vi.fn(() => ({ order }))
    const ilike = vi.fn(() => ({ not }))
    const lte = vi.fn(() => ({ ilike }))
    const gte = vi.fn(() => ({ lte }))
    const neq = vi.fn(() => ({ gte }))
    const profilesSelect = vi.fn(() => ({ neq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'blocks') return { select: blocksSelect }
      if (table === 'profiles') return { select: profilesSelect }
      throw new Error(`unexpected table ${table}`)
    })

    const { searchPlayers } = usePlayerDiscovery()
    const result = await searchPlayers({ minLevel: 2, maxLevel: 4, homeArea: 'Jakarta', currentUserId: 'u1' })

    expect(blocksEq).toHaveBeenCalledWith('blocker_id', 'u1')
    expect(neq).toHaveBeenCalledWith('id', 'u1')
    expect(gte).toHaveBeenCalledWith('skill_level', 2)
    expect(lte).toHaveBeenCalledWith('skill_level', 4)
    expect(ilike).toHaveBeenCalledWith('home_area', '%Jakarta%')
    expect(not).toHaveBeenCalledWith('id', 'in', '(u3)')
    expect(result).toEqual([{ id: 'u2', full_name: 'Rina' }])
  })
})
