import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listMeets = vi.fn().mockResolvedValue([
  { id: 'm1', title: 'Tue Night', venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' },
])
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ listMeets })),
}))

import MeetsListView from './MeetsListView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('MeetsListView', () => {
  it('lists upcoming meets on mount and offers a Create meet button', async () => {
    const wrapper = mount(MeetsListView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listMeets).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Create meet')
  })
})
