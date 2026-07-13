import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u2' } } })),
}))

const getClub = vi.fn().mockResolvedValue({ id: 'c1', name: 'Padel Brow', description: 'Our club' })
const listMembers = vi.fn().mockResolvedValue([{ user_id: 'u1', role: 'owner', profiles: { id: 'u1', full_name: 'Fano' } }])
const getMyMembership = vi.fn().mockResolvedValue(null)
const joinClub = vi.fn().mockResolvedValue()
const leaveClub = vi.fn().mockResolvedValue()

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ getClub, listMembers, getMyMembership, joinClub, leaveClub })),
}))

vi.mock('../composables/useClubMemberships.js', () => ({
  useClubMemberships: vi.fn(() => ({ listMemberships: vi.fn().mockResolvedValue([]), createMembership: vi.fn(), subscribe: vi.fn() })),
}))

import ClubDetailView from './ClubDetailView.vue'

describe('ClubDetailView', () => {
  it('loads club info and members, and shows a Join button when not a member', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/clubs/:id', name: 'club-detail', component: ClubDetailView }],
    })
    router.push('/clubs/c1')
    await router.isReady()
    const wrapper = mount(ClubDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getClub).toHaveBeenCalledWith('c1')
    expect(listMembers).toHaveBeenCalledWith('c1')
    expect(wrapper.text()).toContain('Padel Brow')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })
})
