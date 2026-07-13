import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listCompetitions = vi.fn().mockResolvedValue([{ id: 'co1', name: 'Sunday Cup', format: 'round_robin', status: 'registration_open' }])
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ listCompetitions })),
}))

import CompetitionsListView from './CompetitionsListView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CompetitionsListView', () => {
  it('lists competitions on mount and offers Create competition', async () => {
    const wrapper = mount(CompetitionsListView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listCompetitions).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Sunday Cup')
    expect(wrapper.text()).toContain('Create competition')
  })
})
