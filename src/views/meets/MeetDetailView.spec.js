import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'm1', title: 'Tue Night', creator_id: 'u1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

const listParticipants = vi.fn().mockResolvedValue([
  { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
])
const joinMeet = vi.fn().mockResolvedValue({ id: 'p2', status: 'confirmed' })
const leaveMeet = vi.fn().mockResolvedValue()
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants, joinMeet, leaveMeet })),
}))

vi.mock('../../composables/useChat.js', () => ({
  useChat: vi.fn(() => ({ messages: ref([]), send: vi.fn(), subscribe: () => () => {} })),
}))

import MeetDetailView from './MeetDetailView.vue'

describe('MeetDetailView', () => {
  it('loads the meet + participants and shows Join for a non-participant', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:id', name: 'meet-detail', component: MeetDetailView }],
    })
    router.push('/meets/m1')
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getMeet).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })
})
