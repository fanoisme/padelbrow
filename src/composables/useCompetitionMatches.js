import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/tournamentGenerators.js'

export function useCompetitionMatches() {
  async function listMatches(competitionId) {
    const { data, error } = await supabase
      .from('competition_matches')
      .select('*')
      .eq('competition_id', competitionId)
      .order([{ column: 'round_name' }, { column: 'bracket_position' }])
    if (error) throw error
    return data
  }

  async function enterScore(matchId, scoreA, scoreB) {
    const { data, error } = await supabase
      .from('competition_matches')
      .update({ score_a: scoreA, score_b: scoreB, status: 'completed' })
      .eq('id', matchId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  function computeStandingsFor(matches, teamIds) {
    return computeStandings(matches, teamIds)
  }

  return { listMatches, enterScore, computeStandingsFor }
}
