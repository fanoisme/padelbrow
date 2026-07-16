import { describe, it, expect } from 'vitest'
import { useTheme } from './useTheme.js'

describe('useTheme (dark-only)', () => {
  it('isDark is always true', () => {
    const { isDark, theme } = useTheme()
    expect(isDark.value).toBe(true)
    expect(theme.value).toBe('dark')
  })

  it('toggle and set are no-ops', () => {
    const { isDark, toggle, set } = useTheme()
    toggle()
    expect(isDark.value).toBe(true)
    set('light')
    expect(isDark.value).toBe(true)
  })
})
