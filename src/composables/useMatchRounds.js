import { supabase } from '../lib/supabase.js'
import {
  generateAmericanoRound,
  generateMexicanoRound,
  generateTeamAmericanoRound,
  generateTeamMexicanoRound,
  generateSinglesRound,
} from '../lib/matchFormatGenerators.js'

function generateForFormat(format, input, roundIndex) {
  switch (format) {
    case 'americano':
      return generateAmericanoRound(input.playerIds, roundIndex, input.history || [])
    case 'mexicano':
      return generateMexicanoRound(input.playerIds, roundIndex, input.history || [])
    case 'team_americano':
      return generateTeamAmericanoRound(input.teams, roundIndex, input.history || [])
    case 'team_mexicano':
      return generateTeamMexicanoRound(input.teams, roundIndex, input.history || [])
    case 'singles':
      return generateSinglesRound(input.playerIds, roundIndex, input.history || [])
    default:
      throw new Error(`unsupported format: ${format}`)
  }
}

// Round generators work on opaque participant ids (meet_participants.id).
// A real player's identity in match_players is their profiles.id (user_id);
// a guest has no profiles row, so they're referenced by their
// meet_participants row instead (guest_participant_id).
function identityFor(participant, pid) {
  if (!participant) throw new Error(`Unknown participant id in round: ${pid}`)
  return participant.user_id
    ? { user_id: participant.user_id }
    : { guest_participant_id: participant.id }
}

export function useMatchRounds() {
  async function generateRound(session, input, roundIndex, participants) {
    const roundMatches = generateForFormat(session.format, input, roundIndex)
    if (roundMatches.length === 0) return []

    const byId = new Map(participants.map((p) => [p.id, p]))

    // 1. persist the round
    const { data: round, error: roundError } = await supabase
      .from('match_rounds')
      .insert({ match_session_id: session.id, round_number: roundIndex, status: 'pending' })
      .select()
      .single()
    if (roundError) throw roundError

    // 2. persist matches
    const matchRows = roundMatches.map((m) => ({
      match_round_id: round.id,
      court_number: m.court,
      status: 'pending',
    }))
    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .insert(matchRows)
      .select()
    if (matchError) throw matchError

    // 3. persist players (team a / team b)
    const playerRows = []
    for (let i = 0; i < roundMatches.length; i++) {
      const m = roundMatches[i]
      const matchId = insertedMatches[i].id
      for (const pid of m.team_a) playerRows.push({ match_id: matchId, team: 'a', ...identityFor(byId.get(pid), pid) })
      for (const pid of m.team_b) playerRows.push({ match_id: matchId, team: 'b', ...identityFor(byId.get(pid), pid) })
    }
    const { error: playerError } = await supabase.from('match_players').insert(playerRows)
    if (playerError) throw playerError

    return insertedMatches
  }

  async function listRoundsWithMatches(sessionId, participants) {
    const byUserId = new Map(participants.filter((p) => p.user_id).map((p) => [p.user_id, p.id]))

    const { data: rounds, error: roundError } = await supabase
      .from('match_rounds')
      .select('*')
      .eq('match_session_id', sessionId)
      .order('round_number', { ascending: true })
    if (roundError) throw roundError

    const result = []
    for (const round of rounds) {
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('*, match_players(match_id, user_id, guest_participant_id, team)')
        .eq('match_round_id', round.id)
        .order('court_number', { ascending: true })
      if (matchError) throw matchError
      result.push({
        ...round,
        matches: (matches || []).map((m) => ({
          ...m,
          team_a: (m.match_players || []).filter((p) => p.team === 'a').map((p) => p.guest_participant_id || byUserId.get(p.user_id) || p.user_id),
          team_b: (m.match_players || []).filter((p) => p.team === 'b').map((p) => p.guest_participant_id || byUserId.get(p.user_id) || p.user_id),
        })),
      })
    }
    return result
  }

  return { generateRound, listRoundsWithMatches }
}
