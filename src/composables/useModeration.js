import { supabase } from '../lib/supabase.js'

export function useModeration() {
  async function report(targetType, targetId, reason, reporterId) {
    const { error } = await supabase
      .from('reports')
      .insert({ target_type: targetType, target_id: targetId, reason, reporter_id: reporterId })
    if (error) throw error
  }

  async function blockUser(blockerId, blockedId) {
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId })
    if (error) throw error
  }

  async function unblockUser(blockedId) {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocked_id', blockedId)
    if (error) throw error
  }

  async function listBlocked() {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  return { report, blockUser, unblockUser, listBlocked }
}
