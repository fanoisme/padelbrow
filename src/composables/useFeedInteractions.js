import { supabase } from '../lib/supabase.js'

export function useFeedInteractions() {
  async function listComments(postId) {
    const { data, error } = await supabase
      .from('feed_comments')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function addComment(postId, body, authorId) {
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: postId, body, author_id: authorId })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function deleteComment(commentId) {
    const { error } = await supabase
      .from('feed_comments')
      .delete()
      .eq('id', commentId)
    if (error) throw error
  }

  async function listLikes(postId) {
    const { count, error } = await supabase
      .from('feed_likes')
      .select('', { count: 'exact', head: true })
      .eq('post_id', postId)
    if (error) throw error
    return count ?? 0
  }

  async function isLiked(postId, userId) {
    const { data, error } = await supabase
      .from('feed_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return !!data
  }

  async function toggleLike(postId, userId, currentlyLiked) {
    if (currentlyLiked) {
      const { error } = await supabase
        .from('feed_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) throw error
      return false
    }
    const { error } = await supabase
      .from('feed_likes')
      .insert({ post_id: postId, user_id: userId })
    if (error) throw error
    return true
  }

  return { listComments, addComment, deleteComment, listLikes, isLiked, toggleLike }
}
