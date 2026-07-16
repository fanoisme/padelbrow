import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiThemeToggle from './LiThemeToggle.vue'

describe('LiThemeToggle (dark-only, toggle is no-op)', () => {
  it('renders a button with an accessible label', () => {
    const wrapper = mount(LiThemeToggle)
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toMatch(/theme/i)
  })

  it('always reports dark state', async () => {
    const wrapper = mount(LiThemeToggle)
    const btn = wrapper.find('button')
    // dark-only: aria-pressed reflects isDark=true
    expect(btn.attributes('aria-pressed')).toBe('true')
    // toggle is no-op, state unchanged
    await btn.trigger('click')
    expect(btn.attributes('aria-pressed')).toBe('true')
  })
})
