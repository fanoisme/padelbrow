import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import router from './index.js'

// Only useAuth is imported eagerly by the router (the guard calls it), so only
// it needs mocking. View composables are no longer pulled in at module-load
// time now that route components are lazy `() => import(...)`.
vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(),
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
        component: () => Promise.resolve({ template: '<div />' }),
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
