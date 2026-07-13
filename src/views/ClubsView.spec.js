import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow', description: 'Our club', visibility: 'public' }])
const createClub = vi.fn().mockResolvedValue({ id: 'c2', name: 'New Club' })

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs, searchClubs: vi.fn(), createClub })),
}))

import ClubsView from './ClubsView.vue'

// Renders slot content so club name/description are visible in wrapper.text()
// — the default `RouterLink: true` stub does not render its default slot
// (this bit Task 6's AppLayout test the same way; same fix here).
const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('ClubsView', () => {
  it('lists clubs on mount', async () => {
    const wrapper = mount(ClubsView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listClubs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Padel Brow')
  })
})
