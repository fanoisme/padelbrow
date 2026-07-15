import { supabase } from '../lib/supabase.js'

export function useFeed() {
  async function listFeed(clubId) {
    let q = supabase
      .from('feed_posts')
      .select('*, author:profiles!feed_posts_author_id_fkey(id, full_name, avatar_url)')
    if (clubId) q = q.eq('club_id', clubId)
    q = q.order('created_at', { ascending: false }).limit(50)
    const { data, error } = await q
    if (error) throw error
    return data
  }

  async function createPost(payload, authorId) {
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        caption: payload.caption,
        media_urls: payload.mediaUrls ?? [],
        club_id: payload.clubId ?? null,
        meet_id: payload.meetId ?? null,
        author_id: authorId,
      })
      // Embed author so PostCard can render post.author.* on the just-created row
      // (bare .select() returns table columns only, no relation).
      .select('*, author:profiles!feed_posts_author_id_fkey(id, full_name, avatar_url)')
      .single()
    if (error) throw error
    return data
  }

  async function deletePost(postId) {
    const { error } = await supabase
      .from('feed_posts')
      .delete()
      .eq('id', postId)
    if (error) throw error
  }

  return { listFeed, createPost, deletePost }
}
