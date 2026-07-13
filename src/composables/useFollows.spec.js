import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useFollows } from './useFollows.js'

describe('useFollows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listFollowees returns the followed profiles', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ followee_id: 'u2', profiles: { id: 'u2', full_name: 'Rina' } }],
      error: null,
    })
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listFollowees } = useFollows()
    const result = await listFollowees('u1')

    expect(supabase.from).toHaveBeenCalledWith('follows')
    expect(eq).toHaveBeenCalledWith('follower_id', 'u1')
    expect(result).toEqual([{ id: 'u2', full_name: 'Rina' }])
  })

  it('follow inserts a follows row', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { follow } = useFollows()
    await follow('u1', 'u2')

    expect(insert).toHaveBeenCalledWith({ follower_id: 'u1', followee_id: 'u2' })
  })

  it('unfollow deletes the matching follows row', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const del = vi.fn(() => ({ eq: eq1 }))
    supabase.from.mockReturnValue({ delete: del })

    const { unfollow } = useFollows()
    await unfollow('u1', 'u2')

    expect(eq1).toHaveBeenCalledWith('follower_id', 'u1')
    expect(eq2).toHaveBeenCalledWith('followee_id', 'u2')
  })
})
