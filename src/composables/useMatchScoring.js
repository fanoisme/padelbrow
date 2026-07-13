import { supabase } from '../lib/supabase.js'
import { computeStandings } from '../lib/matchFormatGenerators.js'

export function useMatchScoring() {
  async function enterScore(matchId, scoreA, scoreB) {
    const { error } = await supabase
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB })
      .eq('id', matchId)
    if (error) throw error
  }

  async function finalizeMatch(matchId) {
    const { error } = await supabase.rpc('apply_match_result', { p_match_id: matchId })
    if (error) throw error
  }

  function computeStandingsFor(rounds, playerIds, criteria) {
    const matches = rounds.flatMap((r) => r.matches || [])
    return computeStandings(matches, playerIds, criteria)
  }

  return { enterScore, finalizeMatch, computeStandingsFor }
}
