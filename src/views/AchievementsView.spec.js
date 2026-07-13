import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getMyProgress = vi.fn().mockResolvedValue({ totalXp: 550, level: { level: 2, title: 'Amateur', min_xp: 500 }, nextLevel: { level: 3, title: 'Pro', min_xp: 2000 }, nextMinXp: 2000 })
const getAchievements = vi.fn().mockResolvedValue([
  { id: 'a1', key: 'first_match', name: 'First Match', description: 'Play your first match', tier: 'bronze' },
  { id: 'a2', key: 'ten_matches', name: 'Veteran', description: 'Play 10 matches', tier: 'silver' },
])
const getMyUnlocked = vi.fn().mockResolvedValue(new Set(['a1']))
vi.mock('../composables/useGamification.js', () => ({
  useGamification: vi.fn(() => ({ getMyProgress, getAchievements, getMyUnlocked })),
}))

import AchievementsView from './AchievementsView.vue'

describe('AchievementsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads progress + achievements + marks unlocked ones', async () => {
    const wrapper = mount(AchievementsView)
    await flushPromises()
    expect(getMyProgress).toHaveBeenCalledWith('u1')
    expect(wrapper.text()).toContain('Amateur')
    expect(wrapper.text()).toContain('First Match')
    const cards = wrapper.findAll('[data-testid="achievement-card"]')
    expect(cards[0].classes()).toContain('achievement-card--unlocked')
    expect(cards[1].classes()).not.toContain('achievement-card--unlocked')
  })
})
