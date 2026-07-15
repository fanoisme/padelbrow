import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiScrollProgress from './LiScrollProgress.vue'

describe('LiScrollProgress', () => {
  it('renders a fixed bar with the brand gradient class', () => {
    const wrapper = mount(LiScrollProgress)
    const bar = wrapper.find('.li-scroll-progress__bar')
    expect(bar.exists()).toBe(true)
    expect(wrapper.find('.li-scroll-progress').classes()).toContain('li-scroll-progress')
  })
})
