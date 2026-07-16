import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'm1', title: 'Tue Night', creator_id: 'u1', club_id: null, max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

const listParticipants = vi.fn().mockResolvedValue([
  { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
])
const joinMeet = vi.fn().mockResolvedValue({ id: 'p2', status: 'confirmed' })
const leaveMeet = vi.fn().mockResolvedValue()
const addExistingMember = vi.fn().mockResolvedValue({ id: 'p9', status: 'confirmed' })
const addGuest = vi.fn().mockResolvedValue({ id: 'p10', status: 'confirmed' })
const listClubMembersNotInMeet = vi.fn().mockResolvedValue([{ id: 'u5', full_name: 'Rani' }])
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants, joinMeet, leaveMeet, addExistingMember, addGuest, listClubMembersNotInMeet })),
}))

const listSessionsByMeet = vi.fn().mockResolvedValue([])
vi.mock('../../composables/useMatchSessions.js', () => ({
  useMatchSessions: vi.fn(() => ({ listSessionsByMeet })),
}))

vi.mock('../../composables/useChat.js', () => ({
  useChat: vi.fn(() => ({ messages: ref([]), send: vi.fn(), subscribe: () => () => {} })),
}))

vi.mock('../../composables/useExpenses.js', () => ({
  useExpenses: vi.fn(() => ({
    addExpense: vi.fn(),
    listExpensesWithShares: vi.fn().mockResolvedValue([]),
    deleteExpense: vi.fn(),
  })),
}))

vi.mock('../../composables/usePayments.js', () => ({
  usePayments: vi.fn(() => ({
    createPayment: vi.fn(),
    listPaymentsForMeet: vi.fn().mockResolvedValue([]),
    confirmPayment: vi.fn(),
    rejectPayment: vi.fn(),
    remindUser: vi.fn(),
  })),
}))

vi.mock('../../composables/useStorage.js', () => ({
  useStorage: vi.fn(() => ({ uploadPaymentProof: vi.fn(), uploadFeedMedia: vi.fn() })),
}))

import MeetDetailView from './MeetDetailView.vue'

function mountWithRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/meets/:id', name: 'meet-detail', component: MeetDetailView },
      { path: '/meets/:meetId/match-session/:sessionId?', name: 'match-session', component: { template: '<div>stub match session</div>' } },
    ],
  })
  router.push('/meets/m1')
  return router
}

// LiBottomSheet renders its content via <Teleport to="body">, which moves
// nodes outside the mounted wrapper's element tree. Stub Teleport so its
// slot content renders in place and is reachable via wrapper.find/findAll.
const mountOpts = (router) => ({ global: { plugins: [router], stubs: { teleport: true } } })

describe('MeetDetailView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the meet + participants and shows Join for a non-participant', async () => {
    listParticipants.mockResolvedValueOnce([
      { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
    ])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    expect(getMeet).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })

  it('drives the create wizard when no match session exists yet', async () => {
    listSessionsByMeet.mockResolvedValueOnce([])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const matchBtn = wrapper.findAll('button').find((b) => b.text().match(/open match session/i))
    expect(matchBtn).toBeTruthy()
    await matchBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/meets/m1/match-session')
  })

  it('opens the most recent existing session instead of creating a new one', async () => {
    listSessionsByMeet.mockResolvedValueOnce([
      { id: 's2', format: 'americano', num_courts: 1, status: 'setup', created_at: '2026-07-15T10:00:00Z' },
      { id: 's1', format: 'americano', num_courts: 1, status: 'completed', created_at: '2026-07-14T10:00:00Z' },
    ])
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const matchBtn = wrapper.findAll('button').find((b) => b.text().match(/^open match session$/i))
    expect(matchBtn).toBeTruthy()
    await matchBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/meets/m1/match-session/s2')
  })

  it('organizer can add an existing club member via the Add player sheet', async () => {
    getMeet.mockResolvedValueOnce({ id: 'm1', title: 'Tue Night', creator_id: 'u2', club_id: 'c1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    expect(addBtn).toBeTruthy()
    await addBtn.trigger('click')
    await flushPromises()

    expect(listClubMembersNotInMeet).toHaveBeenCalledWith('m1', 'c1')
    const memberTile = wrapper.findAll('[data-testid="add-player-member"]').find((t) => t.text().includes('Rani'))
    expect(memberTile).toBeTruthy()
    await memberTile.trigger('click')
    await flushPromises()

    expect(addExistingMember).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'u5', 'u2')
  })

  it('organizer can add a guest by name via the Add player sheet', async () => {
    getMeet.mockResolvedValueOnce({ id: 'm1', title: 'Tue Night', creator_id: 'u2', club_id: null, max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    await addBtn.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="guest-name-input"] input').setValue('Bambang')
    const guestBtn = wrapper.find('[data-testid="add-guest-btn"]')
    await guestBtn.trigger('click')
    await flushPromises()

    expect(addGuest).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'Bambang', 'u2')
  })

  it('shows a loading indicator while club members are being fetched, then the list', async () => {
    getMeet.mockResolvedValueOnce({ id: 'm1', title: 'Tue Night', creator_id: 'u2', club_id: 'c1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
    let resolveMembers
    listClubMembersNotInMeet.mockReturnValueOnce(new Promise((resolve) => { resolveMembers = resolve }))

    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    await addBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-player-loading"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No club members left to add.')

    resolveMembers([{ id: 'u5', full_name: 'Rani' }])
    await flushPromises()

    expect(wrapper.find('[data-testid="add-player-loading"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Rani')
  })

  it('non-organizer does not see the Add player button', async () => {
    const router = mountWithRouter()
    await router.isReady()
    const wrapper = mount(MeetDetailView, mountOpts(router))
    await flushPromises()

    const addBtn = wrapper.findAll('button').find((b) => b.text().match(/\+ add player/i))
    expect(addBtn).toBeUndefined()
  })
})
