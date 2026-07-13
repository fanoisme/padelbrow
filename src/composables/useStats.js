import { supabase } from '../lib/supabase.js'

export function useStats() {
  async function getLeaderboard() {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('user_id, rating, matches_played, reliability_pct, user:profiles(id, full_name, avatar_url)')
      .order('rating', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  }

  async function getPersonalHistory(userId) {
    const { data, error } = await supabase
      .from('match_players')
      .select('team, match:matches(id, status, score_a, score_b, created_at, meet:meets(id, title, starts_at))')
      .eq('user_id', userId)
      .order('created_at', { referencedTable: 'match', ascending: false })
    if (error) throw error
    return data
  }

  async function getPersonalStats(userId) {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { getLeaderboard, getPersonalHistory, getPersonalStats }
}
