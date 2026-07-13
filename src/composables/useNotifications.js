import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function useNotifications() {
  const { user } = useAuth()
  const notifications = ref([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)

  async function load() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    notifications.value = data
  }

  function subscribe() {
    load()
    const channel = supabase
      .channel(`notifications:${user.value.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.value.id}` },
        (payload) => {
          notifications.value = [payload.new, ...notifications.value]
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  async function markAllRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', user.value.id)
    if (error) throw error
    // Reflect locally without a refetch.
    notifications.value = notifications.value.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() })
  }

  return { notifications, unreadCount, markAllRead, subscribe }
}
