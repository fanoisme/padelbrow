import { describe, it, expect, vi, beforeEach } from 'vitest'

const channelOn = vi.fn(() => fakeChannel) // FIX: return channel so .channel().on().subscribe() chains (brief mock returned undefined; same defect as useChat.spec.js)
const channelSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }))
const fakeChannel = { on: channelOn, subscribe: channelSubscribe }

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn(), channel: vi.fn(() => fakeChannel) },
}))

vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ user: { value: { id: 'u1' } } }),
}))

import { supabase } from '../lib/supabase.js'
import { useNotifications } from './useNotifications.js'

describe('useNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the current user notifications newest-first on subscribe', async () => {
    // FIX: composable chains .order().limit(30); brief mock resolved at .order().
    // order() now returns { limit } so the chain completes (source of truth = composable).
    const limit = vi.fn().mockResolvedValue({
      data: [
        { id: 'n2', user_id: 'u1', type: 'meet_join', read_at: null, payload: {} },
        { id: 'n1', user_id: 'u1', type: 'waitlist_promoted', read_at: '2026-07-13T00:00:00Z', payload: {} },
      ],
      error: null,
    })
    const order = vi.fn(() => ({ limit }))
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { notifications, unreadCount, subscribe } = useNotifications()
    subscribe()
    await new Promise((r) => setTimeout(r, 0))

    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(notifications.value.length).toBe(2)
    expect(unreadCount.value).toBe(1)
  })

  it('markAllRead sets read_at on all unread rows for the user', async () => {
    const isEq = vi.fn().mockResolvedValue({ error: null })
    const is = vi.fn(() => ({ eq: isEq }))
    const update = vi.fn(() => ({ is }))
    supabase.from.mockReturnValue({ update })

    const { markAllRead } = useNotifications()
    await markAllRead()

    expect(update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(is).toHaveBeenCalledWith('read_at', null)
    expect(isEq).toHaveBeenCalledWith('user_id', 'u1')
  })
})
