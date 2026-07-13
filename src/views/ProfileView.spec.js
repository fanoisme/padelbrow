import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: { value: { id: 'u1' } } })),
}))

const fetchProfile = vi.fn().mockResolvedValue({ id: 'u1', full_name: 'Fano', phone: '', gender: 'unspecified', birthdate: null, skill_level: null, home_area: '' })
const updateProfile = vi.fn().mockResolvedValue({})

vi.mock('../composables/useProfile.js', () => ({
  useProfile: vi.fn(() => ({
    profile: { value: null },
    fetchProfile,
    updateProfile,
  })),
}))

import ProfileView from './ProfileView.vue'

describe('ProfileView', () => {
  it('fetches the current user profile on mount', async () => {
    mount(ProfileView)
    await flushPromises()
    expect(fetchProfile).toHaveBeenCalledWith('u1')
  })
})
