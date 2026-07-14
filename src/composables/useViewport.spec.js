import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useViewport } from './useViewport.js'

function mockMatchMedia(matches) {
  const mql = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return mql
}

describe('useViewport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports isMobile true when the 768px query matches', () => {
    mockMatchMedia(true)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('reports isMobile false when the 768px query does not match', () => {
    mockMatchMedia(false)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(false)
  })

  it('updates isMobile when the media query change fires', () => {
    const mql = mockMatchMedia(false)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(false)
    const handler = mql.addEventListener.mock.calls[0][1]
    handler({ matches: true })
    expect(result.isMobile.value).toBe(true)
  })
})
