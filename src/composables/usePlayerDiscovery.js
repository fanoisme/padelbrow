import { supabase } from '../lib/supabase.js'

export function usePlayerDiscovery() {
  async function searchPlayers({ minLevel, maxLevel, homeArea, currentUserId } = {}) {
    // People the current user has blocked.
    const { data: iBlocked, error: blockErr1 } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId)
    if (blockErr1) throw blockErr1
    // People who have blocked the current user — discovery is symmetric: if
    // either side blocked the other, neither should see the other.
    const { data: blockedMe, error: blockErr2 } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocked_id', currentUserId)
    if (blockErr2) throw blockErr2
    const excludedIds = [
      ...iBlocked.map((b) => b.blocked_id),
      ...blockedMe.map((b) => b.blocker_id),
    ]

    let query = supabase.from('profiles').select('*').neq('id', currentUserId)
    if (minLevel != null) query = query.gte('skill_level', minLevel)
    if (maxLevel != null) query = query.lte('skill_level', maxLevel)
    if (homeArea) query = query.ilike('home_area', `%${homeArea}%`)
    if (excludedIds.length > 0) query = query.not('id', 'in', `(${excludedIds.join(',')})`)

    const { data, error } = await query.order('full_name')
    if (error) throw error
    return data
  }

  return { searchPlayers }
}
