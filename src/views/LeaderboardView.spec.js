import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const getLeaderboard = vi.fn().mockResolvedValue([
  { user_id: 'u1', rating: 5.5, matches_played: 10, user: { full_name: 'Me' } },
  { user_id: 'u2', rating: 4.4, matches_played: 8, user: { full_name: 'A' } },
  { user_id: 'u3', rating: 3.3, matches_played: 6, user: { full_name: 'B' } },
  { user_id: 'u4', rating: 2.2, matches_played: 4, user: { full_name: 'C' } },
])
vi.mock('../composables/useStats.js', () => ({ useStats: vi.fn(() => ({ getLeaderboard })) }))

const { toPng } = vi.hoisted(() => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,abc') }))
vi.mock('html-to-image', () => ({ toPng }))

globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake')
globalThis.URL.revokeObjectURL = vi.fn()

import LeaderboardView from './LeaderboardView.vue'

describe('LeaderboardView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the leaderboard + renders the podium + ranked list', async () => {
    const wrapper = mount(LeaderboardView)
    await flushPromises()
    expect(getLeaderboard).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Me')
    expect(wrapper.text()).toContain('C')
  })

  it('export button calls toPng on the standings node', async () => {
    const wrapper = mount(LeaderboardView)
    await flushPromises()
    await wrapper.find('[data-testid="export-png"]').trigger('click')
    await flushPromises()
    expect(toPng).toHaveBeenCalled()
  })
})
