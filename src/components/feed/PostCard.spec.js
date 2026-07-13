import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const listComments = vi.fn().mockResolvedValue([{ id: 'c1', body: 'nice', author: { id: 'u3', full_name: 'Cara' } }])
const listLikes = vi.fn().mockResolvedValue(2)
const isLiked = vi.fn().mockResolvedValue(false)
const toggleLike = vi.fn().mockResolvedValue(true)
const addComment = vi.fn().mockResolvedValue({ id: 'c9', body: 'k' })
vi.mock('../../composables/useFeedInteractions.js', () => ({
  useFeedInteractions: vi.fn(() => ({ listComments, listLikes, isLiked, toggleLike, addComment, deleteComment: vi.fn() })),
}))

const report = vi.fn().mockResolvedValue(undefined)
const blockUser = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/useModeration.js', () => ({
  useModeration: vi.fn(() => ({ report, blockUser, unblockUser: vi.fn(), listBlocked: vi.fn() })),
}))

const deletePost = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/useFeed.js', () => ({
  useFeed: vi.fn(() => ({ deletePost })),
}))

import PostCard from './PostCard.vue'

const post = {
  id: 'p1',
  caption: 'Great game',
  media_urls: ['https://x/a.png'],
  created_at: '2026-07-13T10:00:00Z',
  author: { id: 'u1', full_name: 'Ana', avatar_url: null },
}

describe('PostCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders author, caption, media and loads likes + comments', async () => {
    const wrapper = mount(PostCard, { props: { post } })
    await flushPromises()
    expect(wrapper.text()).toContain('Great game')
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('nice')
    expect(wrapper.find('img[src="https://x/a.png"]').exists()).toBe(true)
    expect(listLikes).toHaveBeenCalledWith('p1')
    expect(listComments).toHaveBeenCalledWith('p1')
  })

  it('clicking like calls toggleLike and updates the count', async () => {
    const wrapper = mount(PostCard, { props: { post } })
    await flushPromises()
    const likeBtn = wrapper.find('[data-testid="like-btn"]')
    expect(likeBtn.exists()).toBe(true)
    await likeBtn.trigger('click')
    await flushPromises()
    expect(toggleLike).toHaveBeenCalledWith('p1', 'u2', false)
  })

  it('does not show the delete button when the viewer is not the author', async () => {
    const wrapper = mount(PostCard, { props: { post } })
    await flushPromises()
    expect(wrapper.find('[data-testid="delete-btn"]').exists()).toBe(false)
  })

  it('report + block buttons call the moderation composable', async () => {
    const wrapper = mount(PostCard, { props: { post } })
    await flushPromises()
    await wrapper.find('[data-testid="report-btn"]').trigger('click')
    await wrapper.find('[data-testid="block-btn"]').trigger('click')
    await flushPromises()
    expect(report).toHaveBeenCalledWith('feed_post', 'p1', expect.any(String), 'u2')
    expect(blockUser).toHaveBeenCalledWith('u2', 'u1')
  })
})
