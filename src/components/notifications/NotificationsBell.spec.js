import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const subscribe = vi.fn(() => () => {})
const markAllRead = vi.fn().mockResolvedValue()
vi.mock('../../composables/useNotifications.js', () => ({
  useNotifications: vi.fn(() => ({
    notifications: ref([
      { id: 'n1', type: 'meet_join', read_at: null, payload: { meet_title: 'Tue Night', participant_name: 'Rina' } },
    ]),
    unreadCount: ref(1),
    markAllRead,
    subscribe,
  })),
}))

import NotificationsBell from './NotificationsBell.vue'

describe('NotificationsBell', () => {
  it('subscribes on mount and shows the unread count', async () => {
    const wrapper = mount(NotificationsBell)
    await flushPromises()
    expect(subscribe).toHaveBeenCalled()
    expect(wrapper.text()).toContain('1')
  })

  it('lists notifications and marks them read when opened', async () => {
    const wrapper = mount(NotificationsBell)
    await flushPromises()
    await wrapper.find('button.notifications-bell__button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Tue Night')
    expect(markAllRead).toHaveBeenCalled()
  })
})
