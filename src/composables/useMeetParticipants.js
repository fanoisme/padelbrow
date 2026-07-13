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

  async function insertParticipant(meetId, userId, status) {
    const { data, error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, user_id: userId, role: 'player', status })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function joinMeet(meet, userId) {
    const confirmed = await countConfirmed(meet.id)
    const preferred = confirmed < (meet.max_players ?? 4) ? 'confirmed' : 'waitlisted'
    try {
      return await insertParticipant(meet.id, userId, preferred)
    } catch (err) {
      // Race: another user took the last confirmed slot between our count and
      // insert (the DB capacity trigger rejected the over-fill). Fall back to
      // waitlisted rather than surfacing a capacity error to the user.
      if (preferred === 'confirmed') {
        return await insertParticipant(meet.id, userId, 'waitlisted')
      }
      throw err
    }
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
    // Server-side atomic promotion via SECURITY DEFINER RPC: only promotes if
    // confirmed < max_players, and runs as the table owner so a non-creator
    // leaver can promote another user's waitlisted row (the tightened update
    // policy otherwise blocks that). Returns the promoted row or null.
    const { data, error } = await supabase.rpc('promote_next_meet_participant', { p_meet_id: meetId })
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
