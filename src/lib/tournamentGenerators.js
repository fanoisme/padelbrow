// Pure tournament generators — no Supabase, fully unit-testable.

// Round-robin via the circle method. teamIds already in seed order. Byes
// (introduced for odd counts) are skipped — only real pairings returned.
export function generateRoundRobin(teamIds) {
  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push(null) // bye marker
  const n = teams.length
  const roundCount = n - 1
  const matches = []
  const working = teams.slice() // index 0 fixed, rest rotate

  for (let r = 0; r < roundCount; r++) {
    let pos = 0
    for (let i = 0; i < n / 2; i++) {
      const a = working[i]
      const b = working[n - 1 - i]
      if (a !== null && b !== null) {
        matches.push({ round_name: `Round ${r + 1}`, bracket_position: pos, team_a_id: a, team_b_id: b })
        pos++
      }
    }
    // rotate: keep working[0], move the last of the rest to the front of the rest
    const fixed = working[0]
    const rest = working.slice(1)
    rest.unshift(rest.pop())
    working.splice(0, working.length, fixed, ...rest)
  }
  return matches
}

// Seeded single-elimination bracket. Returns the full bracket: round 1 has real
// teams + byes (bye side null); later rounds are placeholders (both null).
// bracket_position = match index within the round; (round r, pos p) feeds into
// (round r+1, floor(p/2)).
export function generateSingleElimination(teamIds) {
  const n = teamIds.length
  if (n < 2) return []
  const p = nextPow2(n)
  const totalRounds = Math.log2(p)
  const seeds = bracketSeedOrder(p) // length p, standard bracket slot order (1-indexed)

  // Map seeds to team ids (seed s → teamIds[s-1]); seeds beyond n are byes.
  const slotTeam = seeds.map((s) => (s <= n ? teamIds[s - 1] : null))

  const matches = []
  // Round 1: pair slotTeam[0]v[1], [2]v[3], ...
  for (let j = 0; j < p / 2; j++) {
    matches.push({
      round_name: bracketRoundName(0, totalRounds),
      bracket_position: j,
      team_a_id: slotTeam[2 * j],
      team_b_id: slotTeam[2 * j + 1],
    })
  }
  // Later rounds: placeholders, both teams TBD.
  let prevMatches = p / 2
  for (let r = 1; r < totalRounds; r++) {
    const thisMatches = prevMatches / 2
    for (let j = 0; j < thisMatches; j++) {
      matches.push({
        round_name: bracketRoundName(r, totalRounds),
        bracket_position: j,
        team_a_id: null,
        team_b_id: null,
      })
    }
    prevMatches = thisMatches
  }
  return matches
}

export function bracketRoundName(roundIndex, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIndex
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Quarterfinal'
  const teamsInRound = Math.pow(2, totalRounds - roundIndex)
  return `Round of ${teamsInRound}`
}

export function computeStandings(matches, teamIds) {
  const table = new Map()
  for (const id of teamIds) {
    table.set(id, { team_id: id, played: 0, won: 0, lost: 0, points_for: 0, points_against: 0 })
  }
  for (const m of matches) {
    if (m.status !== 'completed') continue
    if (m.score_a == null || m.score_b == null) continue
    if (!m.team_a_id || !m.team_b_id) continue
    const a = table.get(m.team_a_id)
    const b = table.get(m.team_b_id)
    if (!a || !b) continue
    a.played++
    b.played++
    a.points_for += m.score_a
    a.points_against += m.score_b
    b.points_for += m.score_b
    b.points_against += m.score_a
    if (m.score_a > m.score_b) {
      a.won++
      b.lost++
    } else if (m.score_b > m.score_a) {
      b.won++
      a.lost++
    }
  }
  return [...table.values()].sort((x, y) => {
    if (y.won !== x.won) return y.won - x.won
    const diffY = y.points_for - y.points_against
    const diffX = x.points_for - x.points_against
    return diffY - diffX
  })
}

function nextPow2(x) {
  let p = 1
  while (p < x) p *= 2
  return p
}

// Standard bracket slot order for a power-of-2 bracket, 1-indexed seeds.
// For P=4 → [1,4,2,3]; P=8 → [1,8,4,5,2,7,3,6]. Recursively: fold each existing
// seed with (2*current+1 - seed).
function bracketSeedOrder(p) {
  let slots = [1]
  while (slots.length < p) {
    const total = slots.length * 2 + 1
    const mirrored = slots.map((s) => total - s)
    slots = slots.flatMap((s, i) => [s, mirrored[i]])
  }
  return slots
}
