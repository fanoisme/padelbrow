import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from './AppLayout.vue'

describe('AppLayout', () => {
  it('renders the PADEL BROW mark, Allo Bank logo, title, and slot content', () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' }
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.find('img.app-header__mark').exists()).toBe(true)
    expect(wrapper.find('img.app-header__allo').exists()).toBe(true)
    expect(wrapper.html()).toContain('page content')
  })
})
