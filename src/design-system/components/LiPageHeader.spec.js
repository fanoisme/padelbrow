import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiPageHeader from './LiPageHeader.vue'

describe('LiPageHeader', () => {
  it('renders the title, optional eyebrow and subtitle', () => {
    const wrapper = mount(LiPageHeader, {
      props: { title: 'Clubs', eyebrow: 'Community', subtitle: 'Find your padel crew' },
    })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Community')
    expect(wrapper.text()).toContain('Find your padel crew')
  })

  it('renders the actions slot next to the title when provided', () => {
    const wrapper = mount(LiPageHeader, {
      props: { title: 'Meets' },
      slots: { actions: '<button>Create meet</button>' },
    })
    expect(wrapper.find('.li-page-header__actions button').text()).toBe('Create meet')
  })

  it('omits the eyebrow and subtitle elements when not provided', () => {
    const wrapper = mount(LiPageHeader, { props: { title: 'Network' } })
    expect(wrapper.find('.li-page-header__eyebrow').exists()).toBe(false)
    expect(wrapper.find('.li-page-header__subtitle').exists()).toBe(false)
    expect(wrapper.find('.li-page-header__actions').exists()).toBe(false)
  })
})
