import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
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
    expect(wrapper.text()).toContain('Welcome to PADEL BROW')
  })
})
