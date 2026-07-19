// PURE match-format generators. No Supabase. Each generator returns a round =
// array of { court, team_a: string[], team_b: string[] }. playerIds are UUIDs.
// roundIndex is 0-based; generators are deterministic given (playerIds, roundIndex).
// history (previous rounds' matches) is accepted for future partnership-optimization
// (prioritize_least_matches) but not yet used in V1 (simple rotation).

function rotate(arr, n) {
  if (arr.length === 0) return arr
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

// Deterministic seeded PRNG so Mexicano generation is reproducible per round.
function mulberry32(seed) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(arr, seed) {
  const rng = mulberry32(seed + 1)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Circle method: pairs for round `roundIndex` of a round-robin over `ids`.
// Odd counts get a null "bye"; bye pairs are dropped from the result.
function circleMethodPairs(ids, roundIndex) {
  const arr = ids.slice()
  if (arr.length % 2 !== 0) arr.push(null)
  const rounds = arr.length - 1
  const r = rounds > 0 ? ((roundIndex % rounds) + rounds) % rounds : 0
  const fixed = arr[0]
  const rest = arr.slice(1)
  const rotated = rotate(rest, r)
  const lineup = [fixed, ...rotated]
  const pairs = []
  const half = lineup.length / 2
  for (let i = 0; i < half; i++) {
    const a = lineup[i]
    const b = lineup[lineup.length - 1 - i]
    if (a !== null && b !== null) pairs.push([a, b])
  }
  return pairs
}

export function generateAmericanoRound(playerIds, roundIndex, history = []) {
  const n = playerIds.length
  if (n < 4) return []
  // Partnerships rotate via the circle method (the same round-robin used for
  // singles opponents below), so across N-1 rounds every player partners every
  // other player exactly once — not just player 0. An earlier version fixed
  // player 0 and rotated the rest as one flat list sliced into courts, which
  // only guaranteed fair rotation for court 1; players on court 2+ repeated
  // partners. Pairing court c's two partnerships against each other spreads
  // that same fairness across every court.
  const pairs = circleMethodPairs(playerIds, roundIndex)
  const half = Math.floor(pairs.length / 2)
  const matches = []
  for (let c = 0; c < half; c++) {
    matches.push({ court: c + 1, team_a: pairs[c], team_b: pairs[c + half] })
  }
  return matches
}

export function generateMexicanoRound(playerIds, roundIndex, history = [], criteria = 'points_won') {
  const n = playerIds.length
  if (n < 4) return []
  const matchesPerRound = Math.floor(n / 4)
  // Round 0 has no results yet, so seed randomly. From round 1 on, real
  // Mexicano ranks players by their running standings and regroups them into
  // quartets by rank, pairing best+worst against the middle two — this keeps
  // every match competitive instead of pairing at random every round.
  if (history.length === 0) {
    const shuffled = seededShuffle(playerIds, roundIndex * 7919 + 31)
    const playing = shuffled.slice(0, matchesPerRound * 4)
    const matches = []
    for (let c = 0; c < matchesPerRound; c++) {
      const g = playing.slice(c * 4, c * 4 + 4)
      const split = seededShuffle(g, roundIndex * 100 + c + 7)
      matches.push({ court: c + 1, team_a: [split[0], split[1]], team_b: [split[2], split[3]] })
    }
    return matches
  }
  const ranked = computeStandings(history, playerIds, criteria).map((s) => s.player_id)
  const playing = ranked.slice(0, matchesPerRound * 4)
  const matches = []
  for (let c = 0; c < matchesPerRound; c++) {
    const [r1, r2, r3, r4] = playing.slice(c * 4, c * 4 + 4)
    matches.push({ court: c + 1, team_a: [r1, r4], team_b: [r2, r3] })
  }
  return matches
}

export function generateTeamAmericanoRound(teams, roundIndex, history = []) {
  if (teams.length < 2) return []
  const pairs = circleMethodPairs(teams.map((t) => t.id), roundIndex)
  return pairs.map((pair, c) => {
    const ta = teams.find((t) => t.id === pair[0])
    const tb = teams.find((t) => t.id === pair[1])
    return { court: c + 1, team_a: ta.playerIds, team_b: tb.playerIds }
  })
}

// Team Mexicano: fixed teams (you keep your partner), but matchups are dynamic
// per round — a seeded shuffle of team order, paired adjacent. Same input shape
// as team_americano ({ id, playerIds }[]). Odd team count sits the last out.
export function generateTeamMexicanoRound(teams, roundIndex, history = []) {
  if (teams.length < 2) return []
  const order = seededShuffle(teams.map((t) => t.id), roundIndex * 7919 + 31)
  const matches = []
  for (let c = 0; c + 1 < order.length; c += 2) {
    const ta = teams.find((t) => t.id === order[c])
    const tb = teams.find((t) => t.id === order[c + 1])
    matches.push({ court: matches.length + 1, team_a: ta.playerIds, team_b: tb.playerIds })
  }
  return matches
}

export function generateSinglesRound(playerIds, roundIndex, history = []) {
  if (playerIds.length < 2) return []
  const pairs = circleMethodPairs(playerIds, roundIndex)
  return pairs.map((pair, c) => ({ court: c + 1, team_a: [pair[0]], team_b: [pair[1]] }))
}

export function computeStandings(matches, playerIds, criteria = 'matches_won') {
  const stats = {}
  for (const id of playerIds) {
    stats[id] = { player_id: id, played: 0, won: 0, lost: 0, points_for: 0, points_against: 0 }
  }
  for (const m of matches) {
    if (m.status !== 'completed') continue
    if (m.score_a == null || m.score_b == null) continue
    const aWon = m.score_a > m.score_b
    for (const pid of m.team_a || []) {
      if (!stats[pid]) continue
      stats[pid].played++
      stats[pid].points_for += m.score_a
      stats[pid].points_against += m.score_b
      if (aWon) stats[pid].won++
      else stats[pid].lost++
    }
    for (const pid of m.team_b || []) {
      if (!stats[pid]) continue
      stats[pid].played++
      stats[pid].points_for += m.score_b
      stats[pid].points_against += m.score_a
      if (!aWon) stats[pid].won++
      else stats[pid].lost++
    }
  }
  const winPct = (r) => (r.played ? r.won / r.played : 0)
  const ptsPct = (r) => {
    const tot = r.points_for + r.points_against
    return tot ? r.points_for / tot : 0
  }
  const sortKey = (r) => {
    switch (criteria) {
      case 'points_won': return r.points_for
      case 'win_pct': return winPct(r)
      case 'points_pct': return ptsPct(r)
      default: return r.won
    }
  }
  return Object.values(stats).sort(
    (a, b) => sortKey(b) - sortKey(a) || b.points_for - a.points_for || a.player_id.localeCompare(b.player_id)
  )
}
