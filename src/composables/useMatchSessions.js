import { supabase } from '../lib/supabase.js'

export function useMatchSessions() {
  async function createSession(payload, meetId) {
    const { data, error } = await supabase
      .from('match_sessions')
      .insert({
        format: payload.format,
        ranking_criteria: payload.ranking_criteria,
        num_courts: payload.num_courts,
        total_set_points: payload.total_set_points,
        prioritize_least_matches: payload.prioritize_least_matches,
        meet_id: meetId,
        status: 'setup',
      })
      .select()
      .single()
    if (error) throw error
    // RLS blocks non-organizers silently → data null, no error. Surface it.
    if (!data) throw new Error('Could not create the match — only the meet organizer can start a session.')
    return data
  }

  async function getSession(id) {
    const { data, error } = await supabase
      .from('match_sessions')
      .select('*, meet:meets(id, title, venue_name, starts_at, max_players)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async function getSessionByCode(code) {
    const { data, error } = await supabase
      .from('match_sessions')
      .select('*, meet:meets(id, title, venue_name, starts_at, max_players)')
      .eq('join_code', String(code).trim().toUpperCase())
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function listSessionsByMeet(meetId) {
    const { data, error } = await supabase
      .from('match_sessions')
      .select('*')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function setStatus(id, status) {
    const { data, error } = await supabase
      .from('match_sessions')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { createSession, getSession, getSessionByCode, listSessionsByMeet, setStatus }
}
