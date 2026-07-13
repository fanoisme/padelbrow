import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useFeedInteractions } from './useFeedInteractions.js'

describe('useFeedInteractions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listComments orders ascending by created_at', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'c1', body: 'nice' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listComments } = useFeedInteractions()
    const result = await listComments('p1')

    expect(supabase.from).toHaveBeenCalledWith('feed_comments')
    expect(eq).toHaveBeenCalledWith('post_id', 'p1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toEqual([{ id: 'c1', body: 'nice' }])
  })

  it('addComment inserts with author_id and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'c1', body: 'k' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { addComment } = useFeedInteractions()
    const result = await addComment('p1', 'k', 'u1')

    expect(insert).toHaveBeenCalledWith({ post_id: 'p1', body: 'k', author_id: 'u1' })
    expect(result).toEqual({ id: 'c1', body: 'k' })
  })

  it('listLikes returns the exact count for a post', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 3, error: null })
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listLikes } = useFeedInteractions()
    const count = await listLikes('p1')

    expect(count).toBe(3)
  })

  it('toggleLike inserts when not currently liked and returns true', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { toggleLike } = useFeedInteractions()
    const liked = await toggleLike('p1', 'u1', false)

    expect(insert).toHaveBeenCalledWith({ post_id: 'p1', user_id: 'u1' })
    expect(liked).toBe(true)
  })

  it('toggleLike deletes when currently liked and returns false', async () => {
    // ponytail: supabase delete query is a chainable thenable; mock supports .eq().eq() then await
    const chain = {}
    const eq = vi.fn(() => chain)
    chain.eq = eq
    chain.then = (resolve) => resolve({ error: null })
    const del = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ delete: del })

    const { toggleLike } = useFeedInteractions()
    const liked = await toggleLike('p1', 'u1', true)

    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('post_id', 'p1')
    expect(liked).toBe(false)
  })
})
