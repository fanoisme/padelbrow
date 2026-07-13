import { describe, it, expect, vi } from 'vitest'

vi.mock('./composables/useAuth.js', () => ({
  initAuth: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./router', () => ({ default: {} }))
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createApp: vi.fn(() => ({ use: vi.fn().mockReturnThis(), mount: vi.fn() })),
  }
})

import { initAuth } from './composables/useAuth.js'
import { createApp } from 'vue'

describe('main.js bootstrap', () => {
  it('awaits initAuth then creates and mounts the app', async () => {
    vi.resetModules()
    await import('./main.js')
    // Flush the initAuth().finally(...) microtask before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(initAuth).toHaveBeenCalled()
    expect(createApp).toHaveBeenCalled()
  })
})
