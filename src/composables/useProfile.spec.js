import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'
import { useProfile } from './useProfile.js'

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchProfile loads the profile row for the given user id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Fano' }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { profile, fetchProfile } = useProfile()
    const result = await fetchProfile('u1')

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'u1')
    expect(result).toEqual({ id: 'u1', full_name: 'Fano' })
    expect(profile.value).toEqual({ id: 'u1', full_name: 'Fano' })
  })

  it('updateProfile writes the given fields and updates local state', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Fano B' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { profile, updateProfile } = useProfile()
    const result = await updateProfile('u1', { full_name: 'Fano B' })

    expect(update).toHaveBeenCalledWith({ full_name: 'Fano B' })
    expect(result).toEqual({ id: 'u1', full_name: 'Fano B' })
    expect(profile.value).toEqual({ id: 'u1', full_name: 'Fano B' })
  })
})
