import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listMemberships = vi.fn().mockResolvedValue([{ id: 'm1', name: 'Monthly Regular', price: 150000, period: 'monthly' }])
const createMembership = vi.fn().mockResolvedValue({})
const subscribe = vi.fn().mockResolvedValue({})

vi.mock('../../composables/useClubMemberships.js', () => ({
  useClubMemberships: vi.fn(() => ({ listMemberships, createMembership, subscribe })),
}))

import ClubMembershipsPanel from './ClubMembershipsPanel.vue'

describe('ClubMembershipsPanel', () => {
  it('lists tiers and shows a Subscribe button per tier', async () => {
    const wrapper = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: false } })
    await flushPromises()
    expect(listMemberships).toHaveBeenCalledWith('c1')
    expect(wrapper.text()).toContain('Monthly Regular')
    expect(wrapper.text()).toContain('Subscribe')
  })

  it('shows an add-tier form only when canManage is true', async () => {
    const wrapperReadOnly = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: false } })
    await flushPromises()
    expect(wrapperReadOnly.find('form').exists()).toBe(false)

    const wrapperManager = mount(ClubMembershipsPanel, { props: { clubId: 'c1', canManage: true } })
    await flushPromises()
    expect(wrapperManager.find('form').exists()).toBe(true)
  })
})
