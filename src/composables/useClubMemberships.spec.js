import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useClubMemberships } from './useClubMemberships.js'

describe('useClubMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listMemberships fetches tiers for a club', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'm1', name: 'Monthly Regular', price: 150000 }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listMemberships } = useClubMemberships()
    const result = await listMemberships('c1')

    expect(eq).toHaveBeenCalledWith('club_id', 'c1')
    expect(result).toEqual([{ id: 'm1', name: 'Monthly Regular', price: 150000 }])
  })

  it('createMembership inserts a new tier', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'm1', name: 'Monthly Regular' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createMembership } = useClubMemberships()
    const result = await createMembership('c1', { name: 'Monthly Regular', price: 150000, period: 'monthly', perks: { priority_rsvp: true } })

    expect(insert).toHaveBeenCalledWith({ club_id: 'c1', name: 'Monthly Regular', price: 150000, period: 'monthly', perks: { priority_rsvp: true } })
    expect(result).toEqual({ id: 'm1', name: 'Monthly Regular' })
  })

  it('subscribe inserts an active subscription with a computed expiry', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', status: 'active' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { subscribe } = useClubMemberships()
    const result = await subscribe('m1', 'u1', 'monthly')

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      membership_id: 'm1',
      user_id: 'u1',
      status: 'active',
    }))
    const insertedArg = insert.mock.calls[0][0]
    expect(typeof insertedArg.expires_at).toBe('string')
    expect(result).toEqual({ id: 's1', status: 'active' })
  })
})
