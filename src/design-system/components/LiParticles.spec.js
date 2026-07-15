import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LiConfetti from './LiConfetti.vue'
import LiSparkle from './LiSparkle.vue'

describe('LiConfetti / LiSparkle', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('LiConfetti renders a positioned container root', () => {
    const w = mount(LiConfetti)
    expect(w.find('.li-confetti').exists()).toBe(true)
  })

  it('LiSparkle fires sparkles on the root when trigger flips to true', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const w = mount(LiSparkle, { props: { trigger: false } })
    expect(w.find('.li-particles').exists()).toBe(false)
    await w.setProps({ trigger: true })
    expect(w.find('.li-particles').exists()).toBe(true)
  })
})
