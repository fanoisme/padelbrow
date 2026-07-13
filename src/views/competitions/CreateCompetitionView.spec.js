import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow' }])
vi.mock('../../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs })),
}))

const createCompetition = vi.fn().mockResolvedValue({ id: 'co-new', name: 'Cup' })
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ createCompetition })),
}))

import CreateCompetitionView from './CreateCompetitionView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CreateCompetitionView', () => {
  it('renders the form and loads clubs on mount', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/competitions/new', name: 'competition-new', component: CreateCompetitionView },
        { path: '/competitions/:id', name: 'competition-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/competitions/new')
    await router.isReady()
    const wrapper = mount(CreateCompetitionView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    expect(listClubs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Create competition')
    expect(wrapper.text()).toContain('Padel Brow')
  })

  it('Number()-coerces numeric fields and calls createCompetition on submit', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/competitions/new', name: 'competition-new', component: CreateCompetitionView },
        { path: '/competitions/:id', name: 'competition-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/competitions/new')
    await router.isReady()
    const wrapper = mount(CreateCompetitionView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().match(/create competition/i))
    expect(btn).toBeTruthy()
    await btn.trigger('click')
    await flushPromises()

    expect(createCompetition).toHaveBeenCalled()
    const payload = createCompetition.mock.calls[0][0]
    // Numeric fields are coerced to actual numbers (not strings).
    expect(typeof payload.fee_amount).toBe('number')
  })
})
