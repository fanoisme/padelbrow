import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMeets } from './useMeets.js'

describe('useMeets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listMeets orders upcoming meets by starts_at ascending', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'm1', title: 'Tue Night' }], error: null })
    const gte = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ gte }))
    supabase.from.mockReturnValue({ select })

    const { listMeets } = useMeets()
    const result = await listMeets()

    expect(supabase.from).toHaveBeenCalledWith('meets')
    expect(gte).toHaveBeenCalledWith('starts_at', expect.any(String))
    expect(order).toHaveBeenCalledWith('starts_at', { ascending: true })
    expect(result).toEqual([{ id: 'm1', title: 'Tue Night' }])
  })

  it('createMeet merges creator_id and returns the inserted row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'm1', title: 'X', creator_id: 'u1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createMeet } = useMeets()
    const result = await createMeet({ title: 'X', sport: 'padel' }, 'u1')

    expect(insert).toHaveBeenCalledWith({ title: 'X', sport: 'padel', creator_id: 'u1' })
    expect(result).toEqual({ id: 'm1', title: 'X', creator_id: 'u1' })
  })

  it('cancelMeet sets status to cancelled', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'm1', status: 'cancelled' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { cancelMeet } = useMeets()
    await cancelMeet('m1')

    expect(update).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(eq).toHaveBeenCalledWith('id', 'm1')
  })
})
