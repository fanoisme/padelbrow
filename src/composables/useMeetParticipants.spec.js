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
      if (insertCall === 1) return Promise.resolve({ data: null, error: { message: 'Meet is at capacity' } })
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
})
