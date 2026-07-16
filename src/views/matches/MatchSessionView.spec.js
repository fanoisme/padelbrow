import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const getSession = vi.fn().mockResolvedValue({ id: 'ms1', meet_id: 'meet1', format: 'americano', ranking_criteria: 'matches_won', status: 'in_progress' })
const createSession = vi.fn().mockResolvedValue({ id: 'ms-new', meet_id: 'meet1' })
const setStatus = vi.fn()
vi.mock('../../composables/useMatchSessions.js', () => ({
  useMatchSessions: vi.fn(() => ({ getSession, createSession, getSessionByCode: vi.fn(), setStatus, listSessionsByMeet: vi.fn() })),
}))

const generateRound = vi.fn().mockResolvedValue([{ id: 'm1' }])
const listRoundsWithMatches = vi.fn().mockResolvedValue([
  { id: 'r1', round_number: 0, status: 'pending', matches: [{ id: 'm1', court_number: 1, status: 'pending', score_a: null, score_b: null, team_a: ['p1', 'p2'], team_b: ['p3', 'p4'] }] },
])
vi.mock('../../composables/useMatchRounds.js', () => ({
  useMatchRounds: vi.fn(() => ({ generateRound, listRoundsWithMatches })),
}))

const enterScore = vi.fn().mockResolvedValue(undefined)
const finalizeMatch = vi.fn().mockResolvedValue(undefined)
const computeStandingsFor = vi.fn(() => [{ player_id: 'p1', played: 1, won: 1, lost: 0, points_for: 21, points_against: 15 }])
vi.mock('../../composables/useMatchScoring.js', () => ({
  useMatchScoring: vi.fn(() => ({ enterScore, finalizeMatch, computeStandingsFor })),
}))

vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({
    listParticipants: vi.fn().mockResolvedValue([
      { id: 'p1', user_id: 'p1', profiles: { full_name: 'Alpha' } },
      { id: 'p2', user_id: 'p2', profiles: { full_name: 'Bravo' } },
      { id: 'p3', user_id: 'p3', profiles: { full_name: 'Charlie' } },
      { id: 'p4', user_id: null, guest_name: 'Delta (guest)' },
    ]),
    joinMeet: vi.fn().mockResolvedValue(undefined),
  })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'meet1', title: 'Kamis with Allo Bank', venue_name: 'Rana Grounds', starts_at: '2026-07-17T18:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

import MatchSessionView from './MatchSessionView.vue'

describe('MatchSessionView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the session + rounds and shows standings', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getSession).toHaveBeenCalledWith('ms1')
    expect(listRoundsWithMatches).toHaveBeenCalledWith('ms1')
    expect(wrapper.text()).toContain('Standings')
    expect(computeStandingsFor).toHaveBeenCalled()
  })

  it('generate-next-round button calls generateRound with the confirmed players', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    const btn = wrapper.find('[data-testid="generate-round-btn"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await flushPromises()

    expect(generateRound).toHaveBeenCalled()
    const input = generateRound.mock.calls[0][1]
    expect(input.playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('drives the create wizard + creates a session when no sessionId is given', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/:meetId/match-session/:sessionId?', name: 'match-session', component: MatchSessionView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div/>' } },
      ],
    })
    router.push('/meets/meet1/match-session')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getSession).not.toHaveBeenCalled()
    expect(getMeet).toHaveBeenCalledWith('meet1')

    // hero → wizard step 1
    await wrapper.find('[data-testid="hero-create"]').trigger('click')
    // step 1 → 2 → 3 → 4
    for (let i = 0; i < 3; i++) {
      await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    }
    // step 4 → create
    const createBtn = wrapper.find('[data-testid="create-session-btn"]')
    expect(createBtn.exists()).toBe(true)
    await createBtn.trigger('click')
    await flushPromises()

    expect(createSession).toHaveBeenCalled()
    const payload = createSession.mock.calls[0][0]
    expect(payload.format).toBe('americano')
    expect(createSession.mock.calls[0][1]).toBe('meet1')
  })

  it('renders a guest participant using guest_name and passes participants into generateRound', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:meetId/match-session/:sessionId', name: 'match-session', component: MatchSessionView }],
    })
    router.push('/meets/meet1/match-session/ms1')
    await router.isReady()
    const wrapper = mount(MatchSessionView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Delta (guest)')

    const btn = wrapper.find('[data-testid="generate-round-btn"]')
    await btn.trigger('click')
    await flushPromises()

    const participantsArg = generateRound.mock.calls[0][3]
    expect(participantsArg.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
})
