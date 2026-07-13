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

  it('shows nav links and a sign-out button when logged in', () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Network')
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('Sign out')
  })
})
