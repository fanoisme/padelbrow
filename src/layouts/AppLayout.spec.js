import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppLayout from './AppLayout.vue'

const signOut = vi.fn().mockResolvedValue()
// Renders slot content so link text is visible in wrapper.text() — the
// default `RouterLink: true` stub does not render its default slot.
const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref(null), signOut })),
}))

import { useAuth } from '../composables/useAuth.js'

describe('AppLayout', () => {
  it('renders the PADEL BROW mark, Allo Bank logo, title, and slot content', () => {
    useAuth.mockReturnValue({ user: ref(null), signOut })
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' },
      global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } },
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.find('img.app-header__mark').exists()).toBe(true)
    expect(wrapper.find('img.app-header__allo').exists()).toBe(true)
    expect(wrapper.html()).toContain('page content')
  })

  it('shows a sign-in link when logged out', () => {
    useAuth.mockReturnValue({ user: ref(null), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Sign in')
  })

  it('shows primary nav links when logged in', () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('More')
  })

  it('reveals secondary destinations and sign-out from the desktop More dropdown', async () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, {
      global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } },
      attachTo: document.body,
    })
    await wrapper.find('.li-dropdown__trigger').trigger('click')
    // LiDropdown renders its menu via <Teleport to="body">, so assert against body.
    expect(document.body.textContent).toContain('Network')
    expect(document.body.textContent).toContain('Stats')
    expect(document.body.textContent).toContain('Challenges')
    expect(document.body.textContent).toContain('Sign out')
    wrapper.unmount()
  })

  it('opens the mobile More sheet and shows the secondary destinations', async () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, {
      global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } },
      attachTo: document.body,
    })
    const moreBtn = wrapper.find('[data-testid="bottom-nav-more"]')
    expect(moreBtn.exists()).toBe(true)
    await moreBtn.trigger('click')
    // LiBottomSheet renders via <Teleport to="body">, so assert against the
    // document body, not wrapper.text() — Vue Test Utils doesn't include
    // teleported content in the component's own text()/html().
    expect(document.body.textContent).toContain('Competitions')
    expect(document.body.textContent).toContain('Network')
    wrapper.unmount()
  })
})
