import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listFollowees = vi.fn().mockResolvedValue([{ id: 'u2', full_name: 'Rina' }])
const follow = vi.fn().mockResolvedValue()
const unfollow = vi.fn().mockResolvedValue()

vi.mock('../composables/useFollows.js', () => ({
  useFollows: vi.fn(() => ({ listFollowees, follow, unfollow })),
}))

const searchPlayers = vi.fn().mockResolvedValue([{ id: 'u3', full_name: 'Dio', skill_level: 3 }])

vi.mock('../composables/usePlayerDiscovery.js', () => ({
  usePlayerDiscovery: vi.fn(() => ({ searchPlayers })),
}))

import NetworkView from './NetworkView.vue'

describe('NetworkView', () => {
  it('lists followed players on mount', async () => {
    const wrapper = mount(NetworkView)
    await flushPromises()
    expect(listFollowees).toHaveBeenCalledWith('u1')
    expect(wrapper.text()).toContain('Rina')
  })

  it('searches players and shows a Follow button for each result', async () => {
    const wrapper = mount(NetworkView)
    await flushPromises()
    await wrapper.find('input[placeholder="Search by area..."]').setValue('Dio')
    await wrapper.find('form[data-testid="discovery-form"]').trigger('submit')
    await flushPromises()
    expect(searchPlayers).toHaveBeenCalledWith(expect.objectContaining({ currentUserId: 'u1' }))
    expect(wrapper.text()).toContain('Dio')
  })
})
