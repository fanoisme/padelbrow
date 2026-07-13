import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getPersonalStats = vi.fn().mockResolvedValue({ user_id: 'u1', rating: 4.2, matches_played: 9, reliability_pct: 88 })
const getPersonalHistory = vi.fn().mockResolvedValue([
  { team: 'a', match: { id: 'm1', status: 'completed', score_a: 21, score_b: 15, meet: { title: 'Tue Night' } } },
  { team: 'b', match: { id: 'm2', status: 'completed', score_a: 21, score_b: 10, meet: { title: 'Thu Night' } } },
])
vi.mock('../composables/useStats.js', () => ({ useStats: vi.fn(() => ({ getPersonalStats, getPersonalHistory })) }))

import PersonalStatsView from './PersonalStatsView.vue'

describe('PersonalStatsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads stats + history and derives W/L', async () => {
    const wrapper = mount(PersonalStatsView)
    await flushPromises()
    expect(getPersonalStats).toHaveBeenCalledWith('u1')
    expect(getPersonalHistory).toHaveBeenCalledWith('u1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('21-15')
  })
})
