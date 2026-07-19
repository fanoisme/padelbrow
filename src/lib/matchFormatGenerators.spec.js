import { describe, it, expect } from 'vitest'
import {
  generateAmericanoRound,
  generateMexicanoRound,
  generateTeamAmericanoRound,
  generateTeamMexicanoRound,
  generateSinglesRound,
  computeStandings,
} from './matchFormatGenerators.js'

describe('generateAmericanoRound', () => {
  it('makes N/4 matches of 4 players each, no player duplicated within a round', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const round = generateAmericanoRound(ids, 0)
    expect(round).toHaveLength(2)
    const seen = new Set()
    for (const m of round) {
      expect(m.team_a).toHaveLength(2)
      expect(m.team_b).toHaveLength(2)
      for (const id of [...m.team_a, ...m.team_b]) {
        expect(seen.has(id)).toBe(false)
        seen.add(id)
      }
    }
    expect(round[0].court).toBe(1)
    expect(round[1].court).toBe(2)
  })

  it('rotates partnerships across rounds (round 0 != round 1 grouping)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const r0 = generateAmericanoRound(ids, 0)
    const r1 = generateAmericanoRound(ids, 1)
    const group0 = [...r0[0].team_a, ...r0[0].team_b].sort().join(',')
    const group1 = [...r1[0].team_a, ...r1[0].team_b].sort().join(',')
    expect(group0).not.toBe(group1)
  })

  it('returns [] for fewer than 4 players', () => {
    expect(generateAmericanoRound(['p1', 'p2', 'p3'], 0)).toEqual([])
  })

  it('sits players out by rotation when N is not a multiple of 4', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
    const round = generateAmericanoRound(ids, 0)
    expect(round).toHaveLength(1)
    const playing = [...round[0].team_a, ...round[0].team_b]
    expect(playing).toHaveLength(4)
    const r1 = generateAmericanoRound(ids, 1)
    const playing1 = [...r1[0].team_a, ...r1[0].team_b]
    expect(playing1.sort().join(',')).not.toBe(playing.sort().join(','))
  })

  it('gives player 0 full partner coverage across 3 rounds for 4 players', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const partners = new Set()
    for (let r = 0; r < 3; r++) {
      const round = generateAmericanoRound(ids, r)
      const teamA = round[0].team_a
      // player 0 (p1) is always in team_a (fixed); partner is the other team_a member.
      const partner = teamA.find((id) => id !== 'p1')
      partners.add(partner)
    }
    expect(partners.size).toBe(3) // partnered p2, p3, p4 — everyone once
  })

  it('gives every player full partner coverage across multiple courts (8 players, 7 rounds)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const partnersOf = {}
    for (const id of ids) partnersOf[id] = new Set()
    for (let r = 0; r < 7; r++) {
      const round = generateAmericanoRound(ids, r)
      for (const m of round) {
        const [a1, a2] = m.team_a
        const [b1, b2] = m.team_b
        partnersOf[a1].add(a2)
        partnersOf[a2].add(a1)
        partnersOf[b1].add(b2)
        partnersOf[b2].add(b1)
      }
    }
    for (const id of ids) {
      expect(partnersOf[id].size).toBe(7) // partnered with all 7 others exactly once, not just the players sharing court 1
    }
  })
})

describe('generateMexicanoRound', () => {
  it('makes 4-player matches and is deterministic for a given roundIndex', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const a = generateMexicanoRound(ids, 0)
    const b = generateMexicanoRound(ids, 0)
    expect(a).toEqual(b)
    expect(a).toHaveLength(2)
    for (const m of a) {
      expect(m.team_a).toHaveLength(2)
      expect(m.team_b).toHaveLength(2)
    }
  })

  it('pairs by current rank once history exists — best+worst vs the middle two, per quartet', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    // p1+p2 blew out p3+p4 in round 0, so rank order is p1, p2 (tied, id tiebreak), then p3, p4.
    const history = [
      { team_a: ['p1', 'p2'], team_b: ['p3', 'p4'], score_a: 21, score_b: 5, status: 'completed' },
    ]
    const round = generateMexicanoRound(ids, 1, history, 'points_won')
    expect(round).toHaveLength(1)
    expect(round[0].team_a.slice().sort()).toEqual(['p1', 'p4']) // rank 1 + rank 4
    expect(round[0].team_b.slice().sort()).toEqual(['p2', 'p3']) // rank 2 + rank 3
  })

  it('applies the same 1+4 vs 2+3 rule per quartet across multiple courts (8 players: 1+4/2+3 on court 1, 5+8/6+7 on court 2)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const history = [
      { team_a: ['p1', 'p2'], team_b: ['p3', 'p4'], score_a: 40, score_b: 30, status: 'completed' },
      { team_a: ['p5', 'p6'], team_b: ['p7', 'p8'], score_a: 20, score_b: 10, status: 'completed' },
    ]
    const round = generateMexicanoRound(ids, 1, history, 'points_won')
    expect(round).toHaveLength(2)
    expect(round[0].team_a.slice().sort()).toEqual(['p1', 'p4'])
    expect(round[0].team_b.slice().sort()).toEqual(['p2', 'p3'])
    expect(round[1].team_a.slice().sort()).toEqual(['p5', 'p8'])
    expect(round[1].team_b.slice().sort()).toEqual(['p6', 'p7'])
  })

  it('falls back to random shuffling when there is no history yet (round 0)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const round = generateMexicanoRound(ids, 0, [], 'points_won')
    expect(round).toHaveLength(1)
    expect(round[0].team_a).toHaveLength(2)
    expect(round[0].team_b).toHaveLength(2)
  })
})

describe('generateTeamAmericanoRound', () => {
  it('pairs teams round-robin (2 teams → 1 match, both player lists used)', () => {
    const teams = [
      { id: 't1', playerIds: ['p1', 'p2'] },
      { id: 't2', playerIds: ['p3', 'p4'] },
    ]
    const round = generateTeamAmericanoRound(teams, 0)
    expect(round).toHaveLength(1)
    expect(round[0].team_a).toEqual(['p1', 'p2'])
    expect(round[0].team_b).toEqual(['p3', 'p4'])
  })

  it('returns [] for fewer than 2 teams', () => {
    expect(generateTeamAmericanoRound([{ id: 't1', playerIds: ['p1', 'p2'] }], 0)).toEqual([])
  })
})

describe('generateTeamMexicanoRound', () => {
  it('pairs fixed teams dynamically and is deterministic per roundIndex', () => {
    const teams = [
      { id: 't1', playerIds: ['p1', 'p2'] },
      { id: 't2', playerIds: ['p3', 'p4'] },
      { id: 't3', playerIds: ['p5', 'p6'] },
      { id: 't4', playerIds: ['p7', 'p8'] },
    ]
    const a = generateTeamMexicanoRound(teams, 0)
    const b = generateTeamMexicanoRound(teams, 0)
    expect(a).toEqual(b)
    expect(a).toHaveLength(2)
    // teams stay intact — both members travel together
    const allTeams = a.flatMap((m) => [m.team_a, m.team_b])
    for (const roster of allTeams) expect(roster).toHaveLength(2)
  })

  it('differs from team_americano (dynamic vs round-robin pairing)', () => {
    const teams = [
      { id: 't1', playerIds: ['p1', 'p2'] },
      { id: 't2', playerIds: ['p3', 'p4'] },
      { id: 't3', playerIds: ['p5', 'p6'] },
      { id: 't4', playerIds: ['p7', 'p8'] },
    ]
    const mex = generateTeamMexicanoRound(teams, 1)
    const am = generateTeamAmericanoRound(teams, 1)
    const key = (r) => r.map((m) => [m.team_a[0], m.team_b[0]].join('|')).join(',')
    expect(key(mex)).not.toBe(key(am))
  })

  it('returns [] for fewer than 2 teams', () => {
    expect(generateTeamMexicanoRound([{ id: 't1', playerIds: ['p1', 'p2'] }], 0)).toEqual([])
  })
})

describe('generateSinglesRound', () => {
  it('makes 1v1 matches via circle method', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const round = generateSinglesRound(ids, 0)
    expect(round).toHaveLength(2)
    for (const m of round) {
      expect(m.team_a).toHaveLength(1)
      expect(m.team_b).toHaveLength(1)
    }
    expect(round[0].team_a[0]).toBe('p1')
  })
})

describe('computeStandings', () => {
  const matches = [
    { team_a: ['p1', 'p2'], team_b: ['p3', 'p4'], score_a: 21, score_b: 15, status: 'completed' },
    { team_a: ['p1', 'p3'], team_b: ['p2', 'p4'], score_a: 10, score_b: 21, status: 'completed' },
    { team_a: ['p1', 'p4'], team_b: ['p2', 'p3'], score_a: 21, score_b: 20, status: 'pending' },
  ]
  const ids = ['p1', 'p2', 'p3', 'p4']

  it('ignores pending matches and tallies played/won/points', () => {
    const rows = computeStandings(matches, ids, 'matches_won')
    const p1 = rows.find((r) => r.player_id === 'p1')
    expect(p1.played).toBe(2)
    expect(p1.won).toBe(1)
    expect(p1.lost).toBe(1)
    expect(p1.points_for).toBe(31)
    expect(p1.points_against).toBe(36)
  })

  it('sorts by matches_won by default (most wins first)', () => {
    const rows = computeStandings(matches, ids, 'matches_won')
    expect(rows[0].won).toBeGreaterThanOrEqual(1)
  })

  it('sorts by points_won when that criteria is given', () => {
    const rows = computeStandings(matches, ids, 'points_won')
    const top = rows[0]
    for (const r of rows) {
      expect(top.points_for).toBeGreaterThanOrEqual(r.points_for)
    }
  })
})
