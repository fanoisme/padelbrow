import { supabase } from '../lib/supabase.js'

export function useGamification() {
  async function getMyProgress(userId) {
    const { data: xpRows, error: xpErr } = await supabase
      .from('xp_events')
      .select('amount')
      .eq('user_id', userId)
    if (xpErr) throw xpErr
    const totalXp = (xpRows || []).reduce((s, r) => s + Number(r.amount), 0)

    const { data: thresholds, error: tErr } = await supabase
      .from('level_thresholds')
      .select('level, title, min_xp')
      .order('min_xp', { ascending: true })
    if (tErr) throw tErr

    let level = (thresholds && thresholds[0]) || { level: 1, title: 'Rookie', min_xp: 0 }
    let nextLevel = null
    for (let i = 0; i < thresholds.length; i++) {
      if (totalXp >= thresholds[i].min_xp) {
        level = thresholds[i]
        nextLevel = thresholds[i + 1] || null
      }
    }
    return { totalXp, level, nextLevel, nextMinXp: nextLevel ? nextLevel.min_xp : null }
  }

  async function getAchievements() {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('tier', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return data
  }

  async function getMyUnlocked(userId) {
    const { data, error } = await supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
    if (error) throw error
    return new Set((data || []).map((r) => r.achievement_id))
  }

  async function getActiveChallenges() {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso)
      .order('ends_at', { ascending: true })
    if (error) throw error
    return data
  }

  return { getMyProgress, getAchievements, getMyUnlocked, getActiveChallenges }
}
