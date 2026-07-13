import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ user: ref({ id: 'u1' }) }),
}))

const channelOn = vi.fn(() => fakeChannel) // FIX: return channel so .channel().on().subscribe() chains (brief mock returned undefined)
const channelSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }))
const fakeChannel = { on: channelOn, subscribe: channelSubscribe }

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => fakeChannel),
  },
}))

import { supabase } from '../lib/supabase.js'
import { useChat } from './useChat.js'

describe('useChat', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribe loads history then opens a realtime channel on chat_messages', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'c1', body: 'hi', author_id: 'u1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { messages, subscribe } = useChat('m1')
    const unsubscribe = subscribe()
    // Flush the history load
    await new Promise((r) => setTimeout(r, 0))

    expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    expect(eq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(supabase.channel).toHaveBeenCalledWith('chat:m1')
    expect(channelOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ event: 'INSERT', table: 'chat_messages' }), expect.any(Function))
    expect(messages.value.map((m) => m.body)).toContain('hi')
    expect(typeof unsubscribe).toBe('function')
  })

  it('send inserts a message row with the current user as author', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { send } = useChat('m1')
    await send('hello court 1')

    expect(insert).toHaveBeenCalledWith({ meet_id: 'm1', author_id: 'u1', body: 'hello court 1' })
  })
})
