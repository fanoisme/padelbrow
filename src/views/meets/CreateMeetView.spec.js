import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

vi.mock('../../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs: vi.fn().mockResolvedValue([]) })),
}))

const createMeet = vi.fn().mockResolvedValue({ id: 'm-new', title: 'Tue Night' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ createMeet })),
}))

const createSession = vi.fn().mockResolvedValue({ id: 's-new' })
vi.mock('../../composables/useMatchSessions.js', () => ({
  useMatchSessions: vi.fn(() => ({ createSession, getSessionByCode: vi.fn().mockResolvedValue(null) })),
}))

vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ joinMeet: vi.fn() })),
}))

vi.mock('../../design-system/components/index.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  }
})

import CreateMeetView from './CreateMeetView.vue'

describe('CreateMeetView', () => {
  function mountView() {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/new', name: 'meet-new', component: CreateMeetView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div />' } },
        { path: '/meets/:meetId/match-session/:sessionId?', name: 'match-session', component: { template: '<div />' } },
      ],
    })
    router.push('/meets/new')
    return router.isReady().then(() =>
      mount(CreateMeetView, { global: { plugins: [router] } })
    )
  }

  it('starts at step 1 (game type selection) in standalone mode', async () => {
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Choose your game type')
    expect(wrapper.text()).toContain('Americano')
    expect(wrapper.text()).toContain('Mexicano')
    // no hero/join screen
    expect(wrapper.text()).not.toContain('Create Room')
    expect(wrapper.text()).not.toContain('Join Match')
  })

  it('drives through 4 steps and calls createMeet + createSession', async () => {
    createMeet.mockClear()
    createSession.mockClear()

    const wrapper = await mountView()
    await flushPromises()

    // Step 1: select americano (default), click Next
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    // Step 2: fill required fields
    const inputs = wrapper.findAll('input')
    // title input
    await inputs[0].setValue('Tuesday Night Social')
    // datetime-local input
    await inputs[2].setValue('2026-07-20T19:00')
    await flushPromises()

    // Next to step 3
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    // Step 3: rules — click Next
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    // Step 4: review — click Create meet
    const createBtn = wrapper.find('[data-testid="create-meet-btn"]')
    expect(createBtn.exists()).toBe(true)
    await createBtn.trigger('click')
    await flushPromises()

    // createMeet called with meet payload + user id
    expect(createMeet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tuesday Night Social',
        sport: 'padel',
        format: 'americano',
      }),
      'u1'
    )

    // createSession called with format + meet id
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'americano' }),
      'm-new'
    )
  })
})
