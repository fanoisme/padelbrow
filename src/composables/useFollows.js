import { supabase } from '../lib/supabase.js'

export function useFollows() {
  async function listFollowees(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('followee_id, profiles!follows_followee_id_fkey(id, full_name, avatar_url, skill_level, home_area)')
      .eq('follower_id', userId)
    if (error) throw error
    return data.map((row) => row.profiles)
  }

  async function follow(followerId, followeeId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followee_id: followeeId })
    if (error) throw error
  }

  async function unfollow(followerId, followeeId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
    if (error) throw error
  }

  return { listFollowees, follow, unfollow }
}
