import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from './AppLayout.vue'

describe('AppLayout', () => {
  it('renders the app title and passed-through slot content', () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' }
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.html()).toContain('page content')
  })
})
