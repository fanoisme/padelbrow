import { supabase } from '../lib/supabase.js'

export function usePlayerDiscovery() {
  async function searchPlayers({ minLevel, maxLevel, homeArea, currentUserId } = {}) {
    const { data: blocked, error: blockErr } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId)
    if (blockErr) throw blockErr
    const blockedIds = blocked.map((b) => b.blocked_id)

    let query = supabase.from('profiles').select('*').neq('id', currentUserId)
    if (minLevel != null) query = query.gte('skill_level', minLevel)
    if (maxLevel != null) query = query.lte('skill_level', maxLevel)
    if (homeArea) query = query.ilike('home_area', `%${homeArea}%`)
    if (blockedIds.length > 0) query = query.not('id', 'in', `(${blockedIds.join(',')})`)

    const { data, error } = await query.order('full_name')
    if (error) throw error
    return data
  }

  return { searchPlayers }
}
