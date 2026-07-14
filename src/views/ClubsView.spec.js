import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow', description: 'Our club', visibility: 'public' }])
const createClub = vi.fn().mockResolvedValue({ id: 'c2', name: 'New Club' })

vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs, searchClubs: vi.fn(), createClub })),
}))

vi.mock('../composables/useViewport.js', () => ({
  useViewport: vi.fn(() => ({ isMobile: ref(false) })),
}))

import ClubsView from './ClubsView.vue'
import { useViewport } from '../composables/useViewport.js'

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

  it('shows the create-club form in a centered LiModal on desktop', async () => {
    useViewport.mockReturnValue({ isMobile: ref(false) })
    const wrapper = mount(ClubsView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
      attachTo: document.body,
    })
    await flushPromises()
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create club/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()
    // LiModal/LiBottomSheet render via <Teleport to="body">, so assert
    // against document.body, not wrapper.text()/wrapper.find().
    expect(document.body.querySelector('.li-modal-overlay')).toBeTruthy()
    expect(document.body.querySelector('.li-bottomsheet-overlay')).toBeFalsy()
    wrapper.unmount()
  })

  it('shows the create-club form in a mobile LiBottomSheet when isMobile is true', async () => {
    useViewport.mockReturnValue({ isMobile: ref(true) })
    const wrapper = mount(ClubsView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
      attachTo: document.body,
    })
    await flushPromises()
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create club/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()
    expect(document.body.querySelector('.li-bottomsheet-overlay')).toBeTruthy()
    expect(document.body.querySelector('.li-modal-overlay')).toBeFalsy()
    wrapper.unmount()
  })
})
