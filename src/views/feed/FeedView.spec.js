import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listFeed = vi.fn().mockResolvedValue([{ id: 'p1', caption: 'Hello', media_urls: [], created_at: '2026-07-13T10:00:00Z', author: { id: 'u2', full_name: 'Ana', avatar_url: null } }])
const createPost = vi.fn().mockResolvedValue({ id: 'p2', caption: 'New', media_urls: [], created_at: '2026-07-13T11:00:00Z', author: { id: 'u1', full_name: 'Me', avatar_url: null } })
vi.mock('../../composables/useFeed.js', () => ({
  useFeed: vi.fn(() => ({ listFeed, createPost, deletePost: vi.fn() })),
}))

const uploadFeedMedia = vi.fn().mockResolvedValue('https://x/y.png')
vi.mock('../../composables/useStorage.js', () => ({
  useStorage: vi.fn(() => ({ uploadFeedMedia })),
}))

vi.mock('../../composables/useFeedInteractions.js', () => ({
  useFeedInteractions: vi.fn(() => ({ listComments: vi.fn().mockResolvedValue([]), listLikes: vi.fn().mockResolvedValue(0), isLiked: vi.fn().mockResolvedValue(false), toggleLike: vi.fn(), addComment: vi.fn(), deleteComment: vi.fn() })),
}))
vi.mock('../../composables/useModeration.js', () => ({
  useModeration: vi.fn(() => ({ report: vi.fn(), blockUser: vi.fn(), unblockUser: vi.fn(), listBlocked: vi.fn() })),
}))

import FeedView from './FeedView.vue'

describe('FeedView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists posts on mount and shows the composer', async () => {
    const wrapper = mount(FeedView)
    await flushPromises()
    expect(listFeed).toHaveBeenCalledWith(undefined)
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Feed')
  })

  it('creates a post from the composer (caption only, no files)', async () => {
    const wrapper = mount(FeedView)
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('New post')
    const btn = wrapper.findAll('button').find((b) => b.text().match(/^post$/i))
    expect(btn).toBeTruthy()
    await btn.trigger('click')
    await flushPromises()
    expect(createPost).toHaveBeenCalled()
    const payload = createPost.mock.calls[0][0]
    expect(payload.caption).toBe('New post')
    expect(payload.mediaUrls).toEqual([])
  })
})
