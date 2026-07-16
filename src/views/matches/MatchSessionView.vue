<template>
  <!-- ───────── LIVE SESSION ───────── -->
  <section v-if="session" class="msv">
    <header class="msv__head">
      <button type="button" class="msv__x" aria-label="Back to meet" @click="backToMeet">
        <LiIcon name="arrow_back" />
      </button>
      <div class="msv__head-text">
        <h1 class="msv__title">{{ session.meet?.title || 'Match session' }}</h1>
        <div class="msv__chips">
          <span class="msv__chip">{{ formatLabel }}</span>
          <span class="msv__chip" :data-variant="session.status">{{ statusLabel }}</span>
          <span v-if="session.join_code" class="msv__chip msv__chip--code" :title="'Shareable match code'">Code {{ session.join_code }}</span>
        </div>
      </div>
    </header>

    <button type="button" class="msv__btn msv__btn--primary" data-testid="generate-round-btn" @click="handleGenerateRound">
      <LiIcon name="add" size="sm" /> Generate next round
    </button>

    <p v-if="!rounds.length" class="msv__empty">No rounds yet. Generate the first round to start playing.</p>

    <section v-for="round in rounds" :key="round.id" class="msv__round">
      <h2 class="msv__round-title">Round {{ round.round_number + 1 }}</h2>
      <div class="msv__round-body">
        <div v-for="m in round.matches" :key="m.id" class="msv__match">
          <div class="msv__match-head">
            <span class="msv__court"><LiIcon name="sports_tennis" size="sm" /> Court {{ m.court_number }}</span>
            <span v-if="m.status === 'completed'" class="msv__score-done">{{ m.score_a }}–{{ m.score_b }}</span>
          </div>
          <div class="msv__teams">
            <span class="msv__team" :class="{ 'msv__team--win': m.status === 'completed' && m.score_a > m.score_b }">
              {{ teamLabel(m.team_a) }}
            </span>
            <span class="msv__vs">vs</span>
            <span class="msv__team" :class="{ 'msv__team--win': m.status === 'completed' && m.score_b > m.score_a }">
              {{ teamLabel(m.team_b) }}
            </span>
          </div>
          <div v-if="m.status !== 'completed'" class="msv__enter">
            <input type="number" class="msv__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
            <input type="number" class="msv__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
            <button type="button" class="msv__btn msv__btn--small" @click="handleFinalize(m)">Finalize</button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="standings.length" class="msv__standings">
      <h2>Standings</h2>
      <div class="msv__standings-scroll">
        <table>
          <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in standings" :key="s.player_id" :class="{ 'msv__row--top': i === 0 }">
              <td>{{ i + 1 }}</td>
              <td>{{ playerName(s.player_id) }}</td>
              <td>{{ s.played }}</td><td>{{ s.won }}</td><td>{{ s.lost }}</td>
              <td>{{ s.points_for }}</td><td>{{ s.points_against }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>

  <!-- ───────── CREATE FLOW (no session yet) ───────── -->
  <CreateMatchFlow
    v-else
    :meet="meet"
    :meet-id="($route.params.meetId)"
    @open="onOpen"
    @close="backToMeet"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiIcon, useToast } from '../../design-system/components/index.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import { useMatchRounds } from '../../composables/useMatchRounds.js'
import { useMatchScoring } from '../../composables/useMatchScoring.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import { useMeets } from '../../composables/useMeets.js'
import CreateMatchFlow from './CreateMatchFlow.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getSession } = useMatchSessions()
const { generateRound, listRoundsWithMatches } = useMatchRounds()
const { enterScore, finalizeMatch, computeStandingsFor } = useMatchScoring()
const { listParticipants } = useMeetParticipants()
const { getMeet } = useMeets()

const session = ref(null)
const meet = ref(null)
const rounds = ref([])
const participants = ref([])
const scoreCache = reactive({})

const FORMAT_LABELS = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  team_mexicano: 'Team Mexicano',
  singles: 'Singles',
}
const formatLabel = computed(() => FORMAT_LABELS[session.value?.format] || session.value?.format || '')
const statusLabel = computed(() => {
  const s = session.value?.status
  if (s === 'in_progress') return 'Live'
  if (s === 'completed') return 'Completed'
  return 'Setup'
})

const playerIds = computed(() => participants.value.map((p) => p.user_id))
const nameById = computed(() => {
  const m = new Map()
  for (const p of participants.value) m.set(p.user_id, p.profiles?.full_name || p.user_id)
  return m
})
const standings = computed(() =>
  session.value ? computeStandingsFor(rounds.value, playerIds.value, session.value.ranking_criteria) : []
)

function playerName(id) { return nameById.value.get(id) || id }
function teamLabel(ids) { return (ids || []).map(playerName).join(' / ') }

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

// Team formats pair the player pool into fixed teams; the others take the flat
// playerIds list. Without this, team_* rounds crash (generator expects `teams`).
function buildRoundInput(format, ids) {
  if (format === 'team_americano' || format === 'team_mexicano') {
    const teams = []
    for (let i = 0; i + 1 < ids.length; i += 2) {
      teams.push({ id: `t${i}`, playerIds: [ids[i], ids[i + 1]] })
    }
    return { teams }
  }
  return { playerIds: ids }
}

async function reload() {
  rounds.value = await listRoundsWithMatches(session.value.id)
}

onMounted(async () => {
  const meetId = route.params.meetId
  if (!route.params.sessionId) {
    // setup mode — just need the meet for the wizard's "basics" step
    try { meet.value = await getMeet(meetId) } catch (err) { toast.error(err.message || 'Could not load the meet.') }
    return
  }
  try {
    session.value = await getSession(route.params.sessionId)
    participants.value = await listParticipants(meetId)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load the match session.')
  }
})

function onOpen(created) {
  router.push({ name: 'match-session', params: { meetId: route.params.meetId, sessionId: created.id } })
}
function backToMeet() {
  router.push({ name: 'meet-detail', params: { id: route.params.meetId } })
}

async function handleGenerateRound() {
  try {
    const nextRound = rounds.value.length
    await generateRound(session.value, buildRoundInput(session.value.format, playerIds.value), nextRound)
    await reload()
    toast.success('Round generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate the round.')
  }
}

async function handleFinalize(m) {
  const inputs = scoreOf(m)
  const a = inputs.a === '' ? null : Number(inputs.a)
  const b = inputs.b === '' ? null : Number(inputs.b)
  if (a == null || b == null) {
    toast.error('Enter both scores first.')
    return
  }
  try {
    await enterScore(m.id, a, b)
    await finalizeMatch(m.id)
    await reload()
    toast.success('Match finalized.')
  } catch (err) {
    toast.error(err.message || 'Could not finalize the match.')
  }
}
</script>

<style scoped>
.msv {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
}

.msv__head { display: flex; align-items: flex-start; gap: var(--space-m, 12px); }
.msv__head-text { flex: 1; min-width: 0; }
.msv__title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.msv__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border: none; background: #1E1E1E; color: #FFFFFF;
  cursor: pointer; border-radius: 50%; flex-shrink: 0;
}
.msv__x:hover { background: #2A2A2A; }
.msv__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.msv__chip {
  display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600; background: #1E1E1E; color: #DDD;
}
.msv__chip[data-variant="in_progress"] { background: var(--color-brand); color: #1A1A1A; }
.msv__chip[data-variant="completed"] { background: rgba(16,185,129,0.18); color: #34D399; }
.msv__chip--code { background: rgba(255,255,255,0.06); color: var(--color-brand); border: 1px dashed rgba(255,175,3,0.4); }

.msv__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: none; cursor: pointer; font: inherit; font-weight: 700; border-radius: 12px;
  transition: filter var(--dur-short) var(--ease-out);
}
.msv__btn--primary { background: var(--color-brand); color: #1A1A1A; padding: 12px 18px; align-self: flex-start; }
.msv__btn--primary:hover { filter: brightness(1.05); }
.msv__btn--small { background: #1E1E1E; color: #FFFFFF; padding: 8px 14px; font-size: 14px; border: 1px solid rgba(255,255,255,0.15); }

.msv__empty { color: #A3A3A3; font-size: 14px; }

.msv__round { background: #1A1A1A; border-radius: 16px; overflow: hidden; }
.msv__round-title { margin: 0; padding: 14px 16px 6px; font-size: 14px; font-weight: 700; color: #A3A3A3; text-transform: uppercase; letter-spacing: 0.04em; }
.msv__round-body { display: flex; flex-direction: column; }
.msv__match { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px; }
.msv__match:first-child { border-top: none; }
.msv__match-head { display: flex; align-items: center; justify-content: space-between; }
.msv__court { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #A3A3A3; }
.msv__score-done { font-size: 18px; font-weight: 800; color: var(--color-brand); }
.msv__teams { display: flex; align-items: center; gap: 10px; }
.msv__team { flex: 1; font-weight: 600; color: #CCC; }
.msv__team--win { color: #FFFFFF; }
.msv__vs { font-size: 12px; color: #A3A3A3; text-transform: uppercase; }
.msv__enter { display: flex; align-items: center; gap: 8px; }
.msv__score-input {
  width: 56px; padding: 8px; text-align: center; font: inherit; color: #FFFFFF;
  background: #121212; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
}
.msv__score-input:focus { outline: none; border-color: var(--color-brand); }

.msv__standings { background: #1A1A1A; border-radius: 16px; padding: 16px; }
.msv__standings h2 { margin: 0 0 12px; font-size: 16px; font-weight: 800; }
.msv__standings-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.msv__standings table { width: 100%; border-collapse: collapse; }
.msv__standings th, .msv__standings td { padding: 10px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
.msv__standings th { color: #A3A3A3; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.msv__standings td { color: #DDD; }
.msv__row--top td { color: var(--color-brand); font-weight: 800; }
</style>
