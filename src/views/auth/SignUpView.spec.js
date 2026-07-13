import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    signUpWithPassword: vi.fn().mockResolvedValue({}),
  })),
}))

import SignUpView from './SignUpView.vue'

describe('SignUpView', () => {
  it('renders name/email/password fields and a submit button', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(SignUpView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Create your account')
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(3)
  })
})
