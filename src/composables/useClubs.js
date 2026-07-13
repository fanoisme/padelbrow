import { supabase } from '../lib/supabase.js'

export function useClubs() {
  async function listClubs() {
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (error) throw error
    return data
  }

  async function searchClubs(query) {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
    if (error) throw error
    return data
  }

  async function createClub({ name, slug, description, visibility }, ownerId) {
    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .insert({ name, slug, description, visibility, owner_id: ownerId })
      .select()
      .single()
    if (clubErr) throw clubErr

    const { error: memberErr } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: ownerId, role: 'owner' })
    if (memberErr) throw memberErr

    return club
  }

  async function joinClub(clubId, userId) {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, user_id: userId, role: 'member' })
    if (error) throw error
  }

  async function leaveClub(clubId, userId) {
    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async function getMyMembership(clubId, userId) {
    const { data, error } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { listClubs, searchClubs, createClub, joinClub, leaveClub, getMyMembership }
}
