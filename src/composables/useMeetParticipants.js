import { supabase } from '../lib/supabase.js'

export function useMeetParticipants() {
  async function listParticipants(meetId) {
    const { data, error } = await supabase
      .from('meet_participants')
      .select('id, user_id, role, status, joined_at, payment_status, profiles(id, full_name, avatar_url)')
      .eq('meet_id', meetId)
      .order('joined_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function countConfirmed(meetId) {
    const { count, error } = await supabase
      .from('meet_participants')
      .select('id', { count: 'exact', head: true })
      .eq('meet_id', meetId)
      .eq('status', 'confirmed')
    if (error) throw error
    return count ?? 0
  }

  async function joinMeet(meet, userId) {
    const confirmed = await countConfirmed(meet.id)
    const status = confirmed < (meet.max_players ?? 4) ? 'confirmed' : 'waitlisted'
    const { data, error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meet.id, user_id: userId, role: 'player', status })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function leaveMeet(meetId, userId) {
    // Capture the row before deleting so we know if a vacancy opens up.
    const { data: existing, error: findErr } = await supabase
      .from('meet_participants')
      .select('status')
      .eq('meet_id', meetId)
      .eq('user_id', userId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!existing) return

    const { error: delErr } = await supabase
      .from('meet_participants')
      .delete()
      .eq('meet_id', meetId)
      .eq('user_id', userId)
    if (delErr) throw delErr

    if (existing.status === 'confirmed') {
      await promoteNext(meetId)
    }
  }

  async function promoteNext(meetId) {
    // Update the earliest waitlisted participant to confirmed. Using an
    // update-through-select: select the one earliest waitlisted row, then
    // update by its key. Supabase's builder doesn't support UPDATE ... WHERE
    // id IN (SELECT ...) directly, so we read-then-update by id.
    const { data: next, error: findErr } = await supabase
      .from('meet_participants')
      .select('id')
      .eq('meet_id', meetId)
      .eq('status', 'waitlisted')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (findErr) throw findErr
    if (!next) return null

    const { data, error } = await supabase
      .from('meet_participants')
      .update({ status: 'confirmed' })
      .eq('id', next.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function inviteUser(meetId, inviteeId, invitedById) {
    const { error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, user_id: inviteeId, role: 'player', status: 'invited', invited_by: invitedById })
    if (error) throw error
  }

  return { listParticipants, joinMeet, leaveMeet, promoteNext, inviteUser }
}
