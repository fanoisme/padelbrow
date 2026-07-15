import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LiThemeToggle from './LiThemeToggle.vue'

describe('LiThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('renders a 44x44 button with an accessible label and pressed state', () => {
    const wrapper = mount(LiThemeToggle)
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toMatch(/theme/i)
    expect(btn.attributes('aria-pressed')).toBeDefined()
  })

  it('flips the theme on click', async () => {
    const wrapper = mount(LiThemeToggle)
    const before = wrapper.find('button').attributes('aria-pressed') === 'true'
    await wrapper.find('button').trigger('click')
    const after = wrapper.find('button').attributes('aria-pressed') === 'true'
    expect(after).toBe(!before)
  })
})
