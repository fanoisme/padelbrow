import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useFeed } from './useFeed.js'

describe('useFeed', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listFeed with no clubId returns all posts newest-first', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'p1', caption: 'hi' }], error: null })
    const order = vi.fn(() => ({ limit }))
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listFeed } = useFeed()
    const result = await listFeed()

    expect(supabase.from).toHaveBeenCalledWith('feed_posts')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(50)
    expect(result).toEqual([{ id: 'p1', caption: 'hi' }])
  })

  it('listFeed with clubId filters to that club', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null })
    const order = vi.fn(() => ({ limit }))
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listFeed } = useFeed()
    await listFeed('club1')

    expect(eq).toHaveBeenCalledWith('club_id', 'club1')
  })

  it('createPost merges author_id + media_urls + null club/meet and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'p1', caption: 'hi' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createPost } = useFeed()
    const result = await createPost({ caption: 'hi', mediaUrls: ['https://x/y.png'] }, 'u1')

    expect(insert).toHaveBeenCalledWith({ caption: 'hi', media_urls: ['https://x/y.png'], club_id: null, meet_id: null, author_id: 'u1' })
    expect(result).toEqual({ id: 'p1', caption: 'hi' })
  })

  it('deletePost removes the post by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ delete: del })

    const { deletePost } = useFeed()
    await deletePost('p1')

    expect(supabase.from).toHaveBeenCalledWith('feed_posts')
    expect(eq).toHaveBeenCalledWith('id', 'p1')
  })
})
