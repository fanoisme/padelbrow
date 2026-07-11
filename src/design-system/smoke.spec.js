import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { LiButton } from './components/index.js'

describe('design system smoke test', () => {
  it('renders LiButton with default slot content and primary styling', () => {
    const wrapper = mount(LiButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toContain('Click me')
    expect(wrapper.classes()).toContain('li-btn-primary')
  })
})
