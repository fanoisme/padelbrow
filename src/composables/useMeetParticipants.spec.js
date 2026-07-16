import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMeetParticipants } from './useMeetParticipants.js'

describe('useMeetParticipants', () => {
  beforeEach(() => vi.clearAllMocks())

  it('joinMeet confirms when under capacity', async () => {
    // count of confirmed participants = 3, max_players = 4 → confirmed
    // Impl count chain: from('meet_participants').select('id',{count,head}).eq('meet_id',m1).eq('status','confirmed')
    const countEq2 = vi.fn().mockResolvedValue({ count: 3, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p1', status: 'confirmed' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockImplementation((table) => {
      if (table === 'meet_participants') {
        // count call uses .select; insert call uses .insert — both exposed on same returned object
        return { select: countSelect, insert: pInsert }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const { joinMeet } = useMeetParticipants()
    const result = await joinMeet({ id: 'm1', max_players: 4 }, 'u1')

    expect(countEq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(countEq2).toHaveBeenCalledWith('status', 'confirmed')
    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', user_id: 'u1', role: 'player', status: 'confirmed' })
    expect(result).toEqual({ id: 'p1', status: 'confirmed' })
  })

  it('joinMeet waitlists when at capacity', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 4, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p2', status: 'waitlisted' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { joinMeet } = useMeetParticipants()
    const result = await joinMeet({ id: 'm1', max_players: 4 }, 'u5')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', user_id: 'u5', role: 'player', status: 'waitlisted' })
    expect(result).toEqual({ id: 'p2', status: 'waitlisted' })
  })

  it('joinMeet falls back to waitlisted when a confirmed insert is rejected by the capacity race', async () => {
    // count=3 looks like there's room, but the confirmed insert rejects (the DB
    // capacity trigger caught a concurrent filler). joinMeet retries as waitlisted.
    const countEq2 = vi.fn().mockResolvedValue({ count: 3, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    let insertCall = 0
    const pSingle = vi.fn().mockImplementation(() => {
      insertCall += 1
      if (insertCall === 1) return Promise.resolve({ data: null, error: { message: 'Meet is at capacity (max 4)', code: '23514' } })
      return Promise.resolve({ data: { id: 'p2', status: 'waitlisted' }, error: null })
    })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { joinMeet } = useMeetParticipants()
    const result = await joinMeet({ id: 'm1', max_players: 4 }, 'u9')

    expect(pInsert).toHaveBeenNthCalledWith(1, { meet_id: 'm1', user_id: 'u9', role: 'player', status: 'confirmed' })
    expect(pInsert).toHaveBeenNthCalledWith(2, { meet_id: 'm1', user_id: 'u9', role: 'player', status: 'waitlisted' })
    expect(result).toEqual({ id: 'p2', status: 'waitlisted' })
  })

  it('promoteNext calls the promote_next_meet_participant RPC and returns the promoted row', async () => {
    supabase.rpc.mockResolvedValue({ data: { id: 'p3', status: 'confirmed' }, error: null })

    const { promoteNext } = useMeetParticipants()
    const result = await promoteNext('m1')

    expect(supabase.rpc).toHaveBeenCalledWith('promote_next_meet_participant', { p_meet_id: 'm1' })
    expect(result).toEqual({ id: 'p3', status: 'confirmed' })
  })

  it('promoteNext returns null when the RPC finds no one to promote', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })

    const { promoteNext } = useMeetParticipants()
    const result = await promoteNext('m1')

    expect(result).toBeNull()
  })

  it('addExistingMember inserts the given user as confirmed and records who added them', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 2, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p9', status: 'confirmed' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addExistingMember } = useMeetParticipants()
    const result = await addExistingMember({ id: 'm1', max_players: 4 }, 'u5', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', user_id: 'u5', invited_by: 'u1', status: 'confirmed' })
    expect(result).toEqual({ id: 'p9', status: 'confirmed' })
  })

  it('addExistingMember waitlists when the meet is at capacity', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 4, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p9', status: 'waitlisted' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addExistingMember } = useMeetParticipants()
    const result = await addExistingMember({ id: 'm1', max_players: 4 }, 'u5', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', user_id: 'u5', invited_by: 'u1', status: 'waitlisted' })
    expect(result).toEqual({ id: 'p9', status: 'waitlisted' })
  })

  it('addGuest inserts a guest_name row (no user_id) as confirmed', async () => {
    const countEq2 = vi.fn().mockResolvedValue({ count: 1, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p10', status: 'confirmed', guest_name: 'Bambang' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addGuest } = useMeetParticipants()
    const result = await addGuest({ id: 'm1', max_players: 4 }, 'Bambang', 'u1')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', role: 'player', guest_name: 'Bambang', invited_by: 'u1', status: 'confirmed' })
    expect(result).toEqual({ id: 'p10', status: 'confirmed', guest_name: 'Bambang' })
  })

  it('listClubMembersNotInMeet returns club members minus existing participants', async () => {
    const membersEq = vi.fn().mockResolvedValue({
      data: [
        { user_id: 'u1', profiles: { id: 'u1', full_name: 'Fano', avatar_url: null } },
        { user_id: 'u5', profiles: { id: 'u5', full_name: 'Rani', avatar_url: null } },
      ],
      error: null,
    })
    const membersSelect = vi.fn(() => ({ eq: membersEq }))

    const existingEq = vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }], error: null })
    const existingSelect = vi.fn(() => ({ eq: existingEq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'club_members') return { select: membersSelect }
      if (table === 'meet_participants') return { select: existingSelect }
      throw new Error(`unexpected table ${table}`)
    })

    const { listClubMembersNotInMeet } = useMeetParticipants()
    const result = await listClubMembersNotInMeet('m1', 'c1')

    expect(membersEq).toHaveBeenCalledWith('club_id', 'c1')
    expect(existingEq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(result).toEqual([{ id: 'u5', full_name: 'Rani', avatar_url: null }])
  })

  it('listClubMembersNotInMeet returns an empty list when the meet has no club', async () => {
    const { listClubMembersNotInMeet } = useMeetParticipants()
    const result = await listClubMembersNotInMeet('m1', null)
    expect(result).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('addExistingMember does not retry as waitlisted on a non-capacity error (e.g. duplicate member)', async () => {
    // count looks like there's room, but the insert fails with a real unique
    // violation (23505) — the member is already in the meet. This must
    // surface as-is, not be silently swallowed into a wrong-cause waitlist retry.
    const countEq2 = vi.fn().mockResolvedValue({ count: 2, error: null })
    const countEq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ eq: countEq }))

    const pSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "meet_participants_meet_id_user_id_key"', code: '23505' },
    })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { addExistingMember } = useMeetParticipants()
    await expect(addExistingMember({ id: 'm1', max_players: 4 }, 'u5', 'u1')).rejects.toThrow(/duplicate key/)
    expect(pInsert).toHaveBeenCalledTimes(1)
  })
})
