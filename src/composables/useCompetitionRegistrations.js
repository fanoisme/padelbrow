import { supabase } from '../lib/supabase.js'

export function useCompetitionRegistrations() {
  async function listRegistrations(competitionId) {
    const { data, error } = await supabase
      .from('competition_registrations')
      .select('team_id, status, seed, competition_teams(id, name, player_ids)')
      .eq('competition_id', competitionId)
    if (error) throw error
    return data
  }

  async function registerTeam(competitionId, { name, playerIds }) {
    const { data: team, error: teamErr } = await supabase
      .from('competition_teams')
      .insert({ competition_id: competitionId, name, player_ids: playerIds })
      .select()
      .single()
    if (teamErr) throw teamErr

    const { error: regErr } = await supabase
      .from('competition_registrations')
      .insert({ competition_id: competitionId, team_id: team.id, status: 'pending' })
    if (regErr) throw regErr

    return team
  }

  async function confirmRegistration(competitionId, teamId, seed) {
    const { data, error } = await supabase
      .from('competition_registrations')
      .update({ seed, status: 'confirmed' })
      .eq('competition_id', competitionId)
      .eq('team_id', teamId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { listRegistrations, registerTeam, confirmRegistration }
}
