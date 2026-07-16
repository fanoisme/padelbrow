import { supabase } from '../lib/supabase.js'

export function useMeetParticipants() {
  async function listParticipants(meetId) {
    const { data, error } = await supabase
      .from('meet_participants')
      .select('id, user_id, guest_name, role, status, joined_at, payment_status, profiles!meet_participants_user_id_fkey(id, full_name, avatar_url)')
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

  async function insertRow(meetId, row) {
    const { data, error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, role: 'player', ...row })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function joinWithCapacity(meet, row) {
    const confirmed = await countConfirmed(meet.id)
    const preferred = confirmed < (meet.max_players ?? 4) ? 'confirmed' : 'waitlisted'
    try {
      return await insertRow(meet.id, { ...row, status: preferred })
    } catch (err) {
      // Race: another user took the last confirmed slot between our count and
      // insert (the DB capacity trigger rejected the over-fill). Fall back to
      // waitlisted rather than surfacing a capacity error to the user.
      if (preferred === 'confirmed') {
        return await insertRow(meet.id, { ...row, status: 'waitlisted' })
      }
      throw err
    }
  }

  async function joinMeet(meet, userId) {
    return joinWithCapacity(meet, { user_id: userId })
  }

  async function addExistingMember(meet, userId, addedBy) {
    return joinWithCapacity(meet, { user_id: userId, invited_by: addedBy })
  }

  async function addGuest(meet, guestName, addedBy) {
    return joinWithCapacity(meet, { guest_name: guestName, invited_by: addedBy })
  }

  async function listClubMembersNotInMeet(meetId, clubId) {
    if (!clubId) return []

    const { data: members, error: membersError } = await supabase
      .from('club_members')
      .select('user_id, profiles(id, full_name, avatar_url)')
      .eq('club_id', clubId)
    if (membersError) throw membersError

    const { data: existing, error: existingError } = await supabase
      .from('meet_participants')
      .select('user_id')
      .eq('meet_id', meetId)
    if (existingError) throw existingError

    const existingIds = new Set((existing || []).map((p) => p.user_id).filter(Boolean))
    return (members || [])
      .filter((m) => !existingIds.has(m.user_id))
      .map((m) => m.profiles)
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

  return {
    listParticipants,
    joinMeet,
    leaveMeet,
    promoteNext,
    inviteUser,
    addExistingMember,
    addGuest,
    listClubMembersNotInMeet,
  }
}
