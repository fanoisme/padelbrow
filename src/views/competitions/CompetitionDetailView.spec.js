import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const getCompetition = vi.fn().mockResolvedValue({ id: 'co1', name: 'Cup', format: 'round_robin', status: 'registration_open', club_id: 'c1' })
const generateMatches = vi.fn().mockResolvedValue([])
vi.mock('../../composables/useCompetitions.js', () => ({
  useCompetitions: vi.fn(() => ({ getCompetition, generateMatches })),
}))

const listRegistrations = vi.fn().mockResolvedValue([
  { team_id: 't1', status: 'confirmed', seed: 1, competition_teams: { id: 't1', name: 'Eagles' } },
])
vi.mock('../../composables/useCompetitionRegistrations.js', () => ({
  useCompetitionRegistrations: vi.fn(() => ({ listRegistrations, registerTeam: vi.fn(), confirmRegistration: vi.fn() })),
}))

const listMatches = vi.fn().mockResolvedValue([{ id: 'cm1', round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2', score_a: null, score_b: null, status: 'pending' }])
vi.mock('../../composables/useCompetitionMatches.js', () => ({
  useCompetitionMatches: vi.fn(() => ({ listMatches, enterScore: vi.fn(), computeStandingsFor: () => [{ team_id: 't1', won: 0, played: 0, lost: 0, points_for: 0, points_against: 0 }] })),
}))

import CompetitionDetailView from './CompetitionDetailView.vue'

describe('CompetitionDetailView', () => {
  it('loads competition + registrations + matches and shows the name', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/competitions/:id', name: 'competition-detail', component: CompetitionDetailView }],
    })
    router.push('/competitions/co1')
    await router.isReady()
    const wrapper = mount(CompetitionDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getCompetition).toHaveBeenCalledWith('co1')
    expect(wrapper.text()).toContain('Cup')
    expect(wrapper.text()).toContain('Eagles')
  })
})
