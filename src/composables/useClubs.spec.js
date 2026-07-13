import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useClubs } from './useClubs.js'

describe('useClubs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listClubs orders clubs by name', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'c1', name: 'Padel Brow' }], error: null })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listClubs } = useClubs()
    const result = await listClubs()

    expect(supabase.from).toHaveBeenCalledWith('clubs')
    expect(order).toHaveBeenCalledWith('name')
    expect(result).toEqual([{ id: 'c1', name: 'Padel Brow' }])
  })

  it('createClub inserts the club then bootstraps the owner membership row', async () => {
    const clubSingle = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Padel Brow' }, error: null })
    const clubSelect = vi.fn(() => ({ single: clubSingle }))
    const clubInsert = vi.fn(() => ({ select: clubSelect }))
    const memberInsert = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'clubs') return { insert: clubInsert }
      if (table === 'club_members') return { insert: memberInsert }
      throw new Error(`unexpected table ${table}`)
    })

    const { createClub } = useClubs()
    const result = await createClub({ name: 'Padel Brow', slug: 'padel-brow', description: '', visibility: 'public' }, 'u1')

    expect(clubInsert).toHaveBeenCalledWith({ name: 'Padel Brow', slug: 'padel-brow', description: '', visibility: 'public', owner_id: 'u1' })
    expect(memberInsert).toHaveBeenCalledWith({ club_id: 'c1', user_id: 'u1', role: 'owner' })
    expect(result).toEqual({ id: 'c1', name: 'Padel Brow' })
  })

  it('joinClub inserts a member row with role member', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { joinClub } = useClubs()
    await joinClub('c1', 'u2')

    expect(insert).toHaveBeenCalledWith({ club_id: 'c1', user_id: 'u2', role: 'member' })
  })

  it('getClub fetches a single club by id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Padel Brow' }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { getClub } = useClubs()
    const result = await getClub('c1')

    expect(eq).toHaveBeenCalledWith('id', 'c1')
    expect(result).toEqual({ id: 'c1', name: 'Padel Brow' })
  })

  it('listMembers fetches club_members joined with profile info, ordered by role', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }],
      error: null,
    })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listMembers } = useClubs()
    const result = await listMembers('c1')

    expect(eq).toHaveBeenCalledWith('club_id', 'c1')
    expect(result).toEqual([{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }])
  })
})
