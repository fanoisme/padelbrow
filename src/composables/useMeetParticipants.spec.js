import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

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

  it('promoteNext updates the earliest waitlisted participant to confirmed', async () => {
    // Impl does two calls: a find (select→eq→eq→order→limit→maybeSingle) then an
    // update (update→eq→select→single). from() exposes both .select and .update.
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'p3' }, error: null })
    const limit = vi.fn(() => ({ maybeSingle }))
    const order = vi.fn(() => ({ limit }))
    const statusEq = vi.fn(() => ({ order }))
    const eq = vi.fn(() => ({ eq: statusEq }))
    const select = vi.fn(() => ({ eq }))

    const updateSingle = vi.fn().mockResolvedValue({ data: { id: 'p3', status: 'confirmed' }, error: null })
    const updateSelect = vi.fn(() => ({ single: updateSingle }))
    const updateEq = vi.fn(() => ({ select: updateSelect }))
    const update = vi.fn(() => ({ eq: updateEq }))

    supabase.from.mockReturnValue({ select, update })

    const { promoteNext } = useMeetParticipants()
    const result = await promoteNext('m1')

    expect(eq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(statusEq).toHaveBeenCalledWith('status', 'waitlisted')
    expect(order).toHaveBeenCalledWith('joined_at', { ascending: true })
    expect(limit).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith({ status: 'confirmed' })
    expect(result).toEqual({ id: 'p3', status: 'confirmed' })
  })
})
