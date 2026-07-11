import { describe, it, expect, afterEach, vi } from 'vitest'

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws a clear error when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await expect(import('./supabase.js')).rejects.toThrow(/Missing VITE_SUPABASE_URL/)
  })

  it('creates a client when env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
    const { supabase } = await import('./supabase.js')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
