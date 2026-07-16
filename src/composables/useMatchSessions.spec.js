import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMatchSessions } from './useMatchSessions.js'

describe('useMatchSessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createSession inserts with meet_id + status setup and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', status: 'setup' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createSession } = useMatchSessions()
    const result = await createSession({ format: 'americano', num_courts: 2 }, 'meet1')

    expect(insert).toHaveBeenCalledWith({ format: 'americano', num_courts: 2, meet_id: 'meet1', status: 'setup' })
    expect(result).toEqual({ id: 'ms1', status: 'setup' })
  })

  it('getSession selects with the embedded meet', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', meet: { id: 'm1', title: 'T' } }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { getSession } = useMatchSessions()
    const result = await getSession('ms1')

    expect(supabase.from).toHaveBeenCalledWith('match_sessions')
    expect(select).toHaveBeenCalledWith('*, meet:meets(id, title, venue_name, starts_at, max_players)')
    expect(eq).toHaveBeenCalledWith('id', 'ms1')
    expect(result.meet.title).toBe('T')
  })

  it('getSessionByCode looks up by uppercased join_code and resolves single-or-null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'ms1', join_code: 'AB12CD34' }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { getSessionByCode } = useMatchSessions()
    const result = await getSessionByCode('ab12cd34')

    expect(eq).toHaveBeenCalledWith('join_code', 'AB12CD34')
    expect(result.id).toBe('ms1')
  })

  it('listSessionsByMeet filters by meet and orders desc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'ms1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listSessionsByMeet } = useMatchSessions()
    const result = await listSessionsByMeet('meet1')

    expect(eq).toHaveBeenCalledWith('meet_id', 'meet1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual([{ id: 'ms1' }])
  })

  it('setStatus updates and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'ms1', status: 'in_progress' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { setStatus } = useMatchSessions()
    const result = await setStatus('ms1', 'in_progress')

    expect(update).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(eq).toHaveBeenCalledWith('id', 'ms1')
    expect(result.status).toBe('in_progress')
  })
})
