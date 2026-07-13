import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase.js'
import { initAuth, useAuth } from './useAuth.js'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initAuth populates user from the existing session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'a@b.com' } } } })
    await initAuth()
    const { user } = useAuth()
    expect(user.value).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('signInWithPassword throws on error and does not resolve data', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })
    const { signInWithPassword } = useAuth()
    await expect(signInWithPassword('a@b.com', 'wrong')).rejects.toEqual({ message: 'Invalid credentials' })
  })

  it('signOut clears the user', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    await initAuth()
    supabase.auth.signOut.mockResolvedValue({ error: null })
    const { user, signOut } = useAuth()
    await signOut()
    expect(user.value).toBe(null)
  })
})
