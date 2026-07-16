import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    signInWithPassword: vi.fn().mockResolvedValue({}),
    signInWithGoogle: vi.fn().mockResolvedValue({}),
  })),
}))

import LoginView from './LoginView.vue'

describe('LoginView', () => {
  it('renders email/password fields and a submit button', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Continue to login')
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(2)
  })
})
