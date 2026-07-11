import { describe, it, expect } from 'vitest'
import router from './index.js'

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
