import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getActiveChallenges = vi.fn().mockResolvedValue([
  {
    id: 'c1', key: 'play_3_weekly', title: 'Play 3 this week', description: 'Play 3 matches',
    period: 'weekly', xp_reward: 50,
    starts_at: '2026-07-12T00:00:00Z', ends_at: '2026-07-19T00:00:00Z',
    target_criteria: { type: 'meet_played', count: 3 },
  },
])
vi.mock('../composables/useGamification.js', () => ({
  useGamification: vi.fn(() => ({ getActiveChallenges })),
}))

const getPersonalHistory = vi.fn().mockResolvedValue([
  { team: 'a', match: { id: 'm1', status: 'completed', score_a: 21, score_b: 15, created_at: '2026-07-13T10:00:00Z' } },
  { team: 'b', match: { id: 'm2', status: 'completed', score_a: 21, score_b: 10, created_at: '2026-07-13T11:00:00Z' } },
])
vi.mock('../composables/useStats.js', () => ({ useStats: vi.fn(() => ({ getPersonalHistory })) }))

import ChallengesView from './ChallengesView.vue'

describe('ChallengesView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads challenges + derives progress from history within the window', async () => {
    const wrapper = mount(ChallengesView)
    await flushPromises()
    expect(getActiveChallenges).toHaveBeenCalled()
    expect(getPersonalHistory).toHaveBeenCalledWith('u1')
    expect(wrapper.text()).toContain('Play 3 this week')
    expect(wrapper.text()).toContain('2 / 3')
  })
})
