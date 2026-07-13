import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import router from './index.js'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

// The router eagerly imports ProfileView.vue, which imports useProfile.js.
// useProfile.js imports the real Supabase client, which throws at module
// load time when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset (as
// they are in this test environment). Mock useProfile.js so this route
// test suite doesn't depend on Supabase configuration.
vi.mock('../composables/useProfile.js', () => ({
  useProfile: vi.fn(() => ({
    profile: { value: null },
    fetchProfile: vi.fn(),
    updateProfile: vi.fn(),
  })),
}))

// Same issue as above: the router eagerly imports ClubsView.vue, which
// imports useClubs.js, which imports the real Supabase client. Mock
// useClubs.js so this route test suite doesn't depend on Supabase
// configuration.
vi.mock('../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({
    listClubs: vi.fn(),
    searchClubs: vi.fn(),
    createClub: vi.fn(),
    joinClub: vi.fn(),
    leaveClub: vi.fn(),
    getMyMembership: vi.fn(),
  })),
}))

// Same issue as above: the router eagerly imports NetworkView.vue, which
// imports useFollows.js and usePlayerDiscovery.js, both of which import the
// real Supabase client. Mock them so this route test suite doesn't depend
// on Supabase configuration.
vi.mock('../composables/useFollows.js', () => ({
  useFollows: vi.fn(() => ({
    listFollowees: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  })),
}))

vi.mock('../composables/usePlayerDiscovery.js', () => ({
  usePlayerDiscovery: vi.fn(() => ({
    searchPlayers: vi.fn(),
  })),
}))

import { useAuth } from '../composables/useAuth.js'

describe('router', () => {
  it('resolves the home route', async () => {
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('resolves unknown paths to not-found', async () => {
    await router.push('/some/unknown/path')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('router auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (!router.hasRoute('protected-test-route')) {
      router.addRoute({
        path: '/login-guard-test-protected',
        name: 'protected-test-route',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      })
    }
  })

  it('redirects to login when the target route requires auth and there is no user', async () => {
    useAuth.mockReturnValue({ user: ref(null) })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/login-guard-test-protected')
  })

  it('allows navigation when a user is present', async () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }) })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('protected-test-route')
  })
})
