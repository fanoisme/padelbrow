import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useParticles', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('confetti spawns the requested count inside a container attached to origin parent', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const origin = document.createElement('div')
    document.body.appendChild(origin)
    const { useParticles } = require('./useParticles.js')
    const { confetti } = useParticles()
    confetti(origin, { count: 12 })
    const layer = origin.querySelector('.li-particles')
    expect(layer).not.toBeNull()
    expect(layer.querySelectorAll('.li-particles__p').length).toBe(12)
  })

  it('confetti is a no-op under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const origin = document.createElement('div')
    const { useParticles } = require('./useParticles.js')
    useParticles().confetti(origin, { count: 12 })
    expect(origin.querySelector('.li-particles')).toBeNull()
  })

  it('sparkle spawns 4–6 particles', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const origin = document.createElement('div')
    document.body.appendChild(origin)
    const { useParticles } = require('./useParticles.js')
    useParticles().sparkle(origin, { count: 5 })
    expect(origin.querySelector('.li-particles').querySelectorAll('.li-particles__p').length).toBe(5)
  })
})
