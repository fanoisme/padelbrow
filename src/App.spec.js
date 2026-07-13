import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ref } from 'vue'
import HomeView from './views/HomeView.vue'

vi.mock('./composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref(null), signOut: vi.fn() })),
}))

import App from './App.vue'

describe('App', () => {
  it('renders the home view through the router', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: HomeView }]
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('PADEL BROW')
  })
})
