import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('initialises from localStorage when a valid theme is stored', async () => {
    localStorage.setItem('padelbrow-theme', 'dark')
    const { useTheme } = await import('./useTheme.js')
    const { isDark, theme } = useTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('falls back to prefers-color-scheme when nothing is stored', async () => {
    vi.stubGlobal('matchMedia', (q) => ({
      matches: q.includes('dark'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { useTheme } = await import('./useTheme.js')
    expect(useTheme().isDark.value).toBe(true)
  })

  it('toggle() flips the theme, persists it, and updates data-theme', async () => {
    const { useTheme } = await import('./useTheme.js')
    const { theme, isDark, toggle } = useTheme()
    const before = isDark.value
    toggle()
    expect(isDark.value).toBe(!before)
    expect(localStorage.getItem('padelbrow-theme')).toBe(theme.value)
    expect(document.documentElement.dataset.theme).toBe(theme.value)
  })
})
