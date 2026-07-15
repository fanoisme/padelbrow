import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiHero from './LiHero.vue'

describe('LiHero', () => {
  it('renders eyebrow, gradient title, subtitle and an actions slot over a mesh', () => {
    const w = mount(LiHero, {
      props: { eyebrow: 'Community', title: 'Meets', subtitle: 'Book a match' },
      slots: { actions: '<button>Create</button>' },
    })
    expect(w.find('.li-mesh').exists()).toBe(true)
    expect(w.text()).toContain('Community')
    expect(w.text()).toContain('Meets')
    expect(w.text()).toContain('Book a match')
    expect(w.find('.li-hero__actions button').text()).toBe('Create')
  })

  it('omits eyebrow/subtitle/actions when not provided', () => {
    const w = mount(LiHero, { props: { title: 'Stats' } })
    expect(w.find('.li-hero__eyebrow').exists()).toBe(false)
    expect(w.find('.li-hero__subtitle').exists()).toBe(false)
    expect(w.find('.li-hero__actions').exists()).toBe(false)
  })
})
