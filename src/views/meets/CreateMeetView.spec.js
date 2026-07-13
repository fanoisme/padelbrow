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

const createMeet = vi.fn().mockResolvedValue({ id: 'm-new', title: 'Tue Night' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ createMeet })),
}))

import CreateMeetView from './CreateMeetView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CreateMeetView', () => {
  it('renders step 1 first and advances to a review/create step', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/new', name: 'meet-new', component: CreateMeetView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/meets/new')
    await router.isReady()
    const wrapper = mount(CreateMeetView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    // Step 1 shows club + sport + format
    expect(wrapper.text()).toContain('Create a meet')
    expect(wrapper.text()).toContain('Padel Brow')
  })

  it('calls createMeet with the wizard payload and creator id on final submit', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/new', name: 'meet-new', component: CreateMeetView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/meets/new')
    await router.isReady()
    const wrapper = mount(CreateMeetView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    // Drive the wizard to the end by clicking Next through each step, then Create.
    const nextButtons = () => wrapper.findAll('button').filter((b) => b.text().match(/next/i))
    while (nextButtons().length > 0) {
      await nextButtons()[0].trigger('click')
      await flushPromises()
    }
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create meet/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()

    // creator_id is intentionally absent from the view's payload (useMeets adds it);
    // objectContaining({}) matches any object, and 'u1' is the load-bearing creator-id arg.
    expect(createMeet).toHaveBeenCalledWith(expect.objectContaining({}), 'u1')
  })
})
