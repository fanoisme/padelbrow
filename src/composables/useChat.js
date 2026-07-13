import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function useChat(meetId) {
  const { user } = useAuth()
  const messages = ref([])

  async function loadHistory() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, author_id, body, created_at')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: true })
    if (error) throw error
    messages.value = data
  }

  function subscribe() {
    loadHistory()
    const channel = supabase
      .channel(`chat:${meetId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `meet_id=eq.${meetId}` },
        (payload) => {
          messages.value = [...messages.value, payload.new]
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function send(body) {
    const { error } = await supabase
      .from('chat_messages')
      .insert({ meet_id: meetId, author_id: user.value.id, body })
    if (error) throw error
    // Realtime will append the row via subscribe(); no local push needed.
  }

  return { messages, send, subscribe }
}
