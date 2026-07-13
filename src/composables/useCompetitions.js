import { supabase } from '../lib/supabase.js'
import { generateRoundRobin, generateSingleElimination } from '../lib/tournamentGenerators.js'

export function useCompetitions() {
  async function listCompetitions() {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function getCompetition(id) {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function createCompetition(payload, clubId) {
    const { data, error } = await supabase
      .from('competitions')
      .insert({ ...payload, club_id: clubId, status: 'draft' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function setStatus(id, status) {
    const { data, error } = await supabase
      .from('competitions')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function openRegistration(id) {
    return setStatus(id, 'registration_open')
  }

  async function startCompetition(id) {
    return setStatus(id, 'in_progress')
  }

  async function generateMatches(competition, seededTeams) {
    const teamIds = seededTeams.map((t) => t.id)
    let generated
    if (competition.format === 'round_robin') {
      generated = generateRoundRobin(teamIds)
    } else if (competition.format === 'single_elim') {
      generated = generateSingleElimination(teamIds)
    } else {
      throw new Error(`unsupported format: ${competition.format}`)
    }

    const rows = generated.map((m) => ({
      competition_id: competition.id,
      round_name: m.round_name,
      bracket_position: m.bracket_position,
      team_a_id: m.team_a_id,
      team_b_id: m.team_b_id,
    }))
    // .select() so PostgREST returns the inserted rows (default Prefer: return=minimal
    // would yield { data: null }); handleGenerate discards them but the contract stays honest.
    const { data, error } = await supabase.from('competition_matches').insert(rows).select()
    if (error) throw error

    const { error: statusError } = await supabase
      .from('competitions')
      .update({ status: 'in_progress' })
      .eq('id', competition.id)
    if (statusError) throw statusError
    return data
  }

  return { listCompetitions, getCompetition, createCompetition, openRegistration, startCompetition, generateMatches }
}
