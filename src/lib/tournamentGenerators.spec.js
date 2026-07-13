import { describe, it, expect } from 'vitest'
import {
  generateRoundRobin,
  generateSingleElimination,
  bracketRoundName,
  computeStandings,
} from './tournamentGenerators.js'

describe('generateRoundRobin', () => {
  it('produces every pairing exactly once for an even team count', () => {
    const ids = ['A', 'B', 'C', 'D']
    const matches = generateRoundRobin(ids)
    // 4 teams → 6 unique pairings, across 3 rounds of 2 matches.
    const pairings = matches.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()
    expect(pairings).toEqual(['A-B', 'A-C', 'A-D', 'B-C', 'B-D', 'C-D'])
    expect(matches.every((m) => m.team_a_id && m.team_b_id)).toBe(true)
  })

  it('skips byes for an odd team count (no null-sided matches)', () => {
    const ids = ['A', 'B', 'C']
    const matches = generateRoundRobin(ids)
    // 3 teams → 3 real pairings (A-B, A-C, B-C); byes omitted.
    const pairings = matches.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()
    expect(pairings).toEqual(['A-B', 'A-C', 'B-C'])
    expect(matches.every((m) => m.team_a_id && m.team_b_id)).toBe(true)
  })

  it('assigns sequential bracket positions within each round', () => {
    const matches = generateRoundRobin(['A', 'B', 'C', 'D'])
    const rounds = {}
    for (const m of matches) {
      rounds[m.round_name] = rounds[m.round_name] || []
      rounds[m.round_name].push(m.bracket_position)
    }
    for (const name of Object.keys(rounds)) {
      const positions = rounds[name]
      expect(positions.sort((a, b) => a - b)).toEqual(positions.map((_, i) => i))
    }
  })
})

describe('generateSingleElimination', () => {
  it('seeds round 1 so 1 vs last and 2 vs 2nd-last, with byes to top seeds when not a power of 2', () => {
    // 6 teams, next pow2 = 8 → 2 byes (seeds 1 and 2 skip round 1).
    const ids = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
    const matches = generateSingleElimination(ids)
    // ponytail: original filter used round_name.includes('Round of 8') which fails
    // because 8-slot bracket (totalRounds=3) names round 0 'Quarterfinal'.
    // Fixed to filter by team presence: round 1 has real teams/byes, later rounds are both-null.
    const round1 = matches.filter((m) => m.team_a_id !== null || m.team_b_id !== null)
    // The two real round-1 matches pair seeds 3v6 and 4v5 (1 and 2 bye).
    const realR1 = round1.filter((m) => m.team_a_id && m.team_b_id)
    const byes = round1.filter((m) => (m.team_a_id === null) !== (m.team_b_id === null))
    expect(realR1.length + byes.length).toBe(4) // 8 slots → 4 round-1 "matches"
    expect(byes.length).toBe(2)
    expect(realR1.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()).toEqual(['T3-T6', 'T4-T5'])
  })

  it('pairs 1 vs last directly when team count is a power of 2', () => {
    const ids = ['T1', 'T2', 'T3', 'T4']
    const matches = generateSingleElimination(ids)
    const round1 = matches.filter((m) => m.bracket_position < 2 && m.team_a_id && m.team_b_id)
    // Standard 4-slot bracket: 1v4 and 2v3
    expect(round1.map((m) => [m.team_a_id, m.team_b_id].sort().join('-')).sort()).toEqual(['T1-T4', 'T2-T3'])
  })

  it('emits placeholder matches for later rounds with both teams null (TBD)', () => {
    const matches = generateSingleElimination(['T1', 'T2', 'T3', 'T4'])
    const final = matches.find((m) => m.round_name === 'Final')
    expect(final).toBeTruthy()
    expect(final.team_a_id).toBeNull()
    expect(final.team_b_id).toBeNull()
  })
})

describe('bracketRoundName', () => {
  it('names the last round Final, then Semifinal, Quarterfinal, else Round of N', () => {
    // 4-team bracket (totalRounds=2): index 1 = Final, index 0 = Semifinal
    expect(bracketRoundName(1, 2)).toBe('Final')
    expect(bracketRoundName(0, 2)).toBe('Semifinal')
    // 8-team bracket (totalRounds=3): index 0 = Quarterfinal, index 2 = Final
    expect(bracketRoundName(2, 3)).toBe('Final')
    expect(bracketRoundName(0, 3)).toBe('Quarterfinal')
    // 16-team bracket (totalRounds=4): index 0 = Round of 16, index 3 = Final
    expect(bracketRoundName(0, 4)).toBe('Round of 16')
    expect(bracketRoundName(3, 4)).toBe('Final')
  })
})

describe('computeStandings', () => {
  it('tallies won/lost/points from completed matches and sorts by wins then diff', () => {
    const matches = [
      { team_a_id: 'A', team_b_id: 'B', score_a: 6, score_b: 3, status: 'completed' },
      { team_a_id: 'A', team_b_id: 'C', score_a: 6, score_b: 4, status: 'completed' },
      { team_a_id: 'B', team_b_id: 'C', score_a: 2, score_b: 6, status: 'completed' },
      { team_a_id: 'A', team_b_id: 'B', score_a: null, score_b: null, status: 'pending' }, // ignored
    ]
    const standings = computeStandings(matches, ['A', 'B', 'C'])
    // A: 2W 0L pf12 pa7 ; C: 1W 1L pf10 pa8 ; B: 0W 2L pf5 pa12
    expect(standings.map((s) => s.team_id)).toEqual(['A', 'C', 'B'])
    const a = standings.find((s) => s.team_id === 'A')
    expect(a).toMatchObject({ played: 2, won: 2, lost: 0, points_for: 12, points_against: 7 })
    const b = standings.find((s) => s.team_id === 'B')
    expect(b).toMatchObject({ played: 2, won: 0, lost: 2 })
  })
})
