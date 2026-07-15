import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useCursorAwareness', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

  it('reports disabled under prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(false)
  })

  it('reports disabled on touch (coarse pointer)', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('coarse'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(false)
  })

  it('reports enabled on a fine-pointer, motion-ok desktop', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(true)
  })

  it('magnetic() returns a zero offset handler set when disabled', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    const m = useCursorAwareness().magnetic()
    expect(m.style.value.transform).toBe('translate(0px, 0px)')
  })
})
