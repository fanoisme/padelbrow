import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useModeration } from './useModeration.js'

describe('useModeration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('report inserts with reporter_id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { report } = useModeration()
    await report('feed_post', 'p1', 'spam', 'u1')

    expect(insert).toHaveBeenCalledWith({ target_type: 'feed_post', target_id: 'p1', reason: 'spam', reporter_id: 'u1' })
  })

  it('blockUser inserts blocker_id + blocked_id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { blockUser } = useModeration()
    await blockUser('u1', 'u2')

    expect(insert).toHaveBeenCalledWith({ blocker_id: 'u1', blocked_id: 'u2' })
  })

  it('unblockUser deletes by blocked_id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ delete: del })

    const { unblockUser } = useModeration()
    await unblockUser('u2')

    expect(supabase.from).toHaveBeenCalledWith('blocks')
    expect(eq).toHaveBeenCalledWith('blocked_id', 'u2')
  })

  it('listBlocked selects the blocked profile via the constraint-qualified FK', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ blocked_id: 'u2', created_at: '2026-07-13', blocked: { id: 'u2', full_name: 'Bob', avatar_url: null } }],
      error: null,
    })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listBlocked } = useModeration()
    const result = await listBlocked()

    expect(supabase.from).toHaveBeenCalledWith('blocks')
    expect(select).toHaveBeenCalledWith('blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, full_name, avatar_url)')
    expect(result[0].blocked.full_name).toBe('Bob')
  })
})
