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

  it('excludes the current user and blocked users in both directions, applies level/area filters', async () => {
    // `blocker_id = u1` → people u1 blocked (returns u3). `blocked_id = u1`
    // → people who blocked u1 (returns u4). Both must be excluded.
    const blocksEq = vi.fn((column) => {
      if (column === 'blocker_id') return Promise.resolve({ data: [{ blocked_id: 'u3' }], error: null })
      if (column === 'blocked_id') return Promise.resolve({ data: [{ blocker_id: 'u4' }], error: null })
      return Promise.resolve({ data: [], error: null })
    })
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
    expect(blocksEq).toHaveBeenCalledWith('blocked_id', 'u1')
    expect(neq).toHaveBeenCalledWith('id', 'u1')
    expect(gte).toHaveBeenCalledWith('skill_level', 2)
    expect(lte).toHaveBeenCalledWith('skill_level', 4)
    expect(ilike).toHaveBeenCalledWith('home_area', '%Jakarta%')
    expect(not).toHaveBeenCalledWith('id', 'in', '(u3,u4)')
    expect(result).toEqual([{ id: 'u2', full_name: 'Rina' }])
  })
})
