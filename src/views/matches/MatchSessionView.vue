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
          <span class="msv__chip msv__chip--format">{{ formatLabel }}</span>
          <span class="msv__chip" :data-variant="session.status">
            <span v-if="session.status === 'in_progress'" class="msv__dot"></span>{{ statusLabel }}
          </span>
          <span v-if="session.join_code" class="msv__chip msv__chip--code" :title="'Shareable match code'">Code {{ session.join_code }}</span>
        </div>
      </div>
    </header>

    <button
      v-if="!rounds.length || session.status !== 'completed'"
      type="button"
      class="msv__cta"
      data-testid="generate-round-btn"
      @click="handleGenerateRound"
    >
      <LiIcon name="add" size="sm" /> {{ rounds.length ? 'Generate next round' : 'Generate first round' }}
    </button>

    <p v-if="!rounds.length" class="msv__empty">No rounds yet. Generate the first round to start playing.</p>

    <section v-for="round in rounds" :key="round.id" class="msv__round">
      <div class="msv__round-head">
        <h2 class="msv__round-title">Round {{ round.round_number + 1 }}</h2>
        <span class="msv__round-meta">{{ round.matches.length }} match{{ round.matches.length === 1 ? '' : 'es' }}</span>
      </div>
      <div class="msv__round-grid">
        <article
          v-for="m in round.matches"
          :key="m.id"
          class="msv__match"
          :data-state="m.status"
        >
          <header class="msv__match-bar">
            <span class="msv__court"><LiIcon name="sports_tennis" size="sm" /> Court {{ m.court_number }}</span>
            <span class="msv__pill" :data-state="m.status">{{ stateLabel(m) }}</span>
          </header>

          <div class="msv__board">
            <!-- TEAM A -->
            <div class="msv__team" :class="winClass(m, 'a')">
              <div v-for="pid in m.team_a" :key="pid" class="msv__player">
                <span class="msv__avatar" :style="avatarStyle(pid)">
                  <img v-if="avatar(pid)" :src="avatar(pid)" :alt="name(pid)" />
                  <span v-else>{{ initials(pid) }}</span>
                </span>
                <span class="msv__pname">{{ name(pid) }}</span>
              </div>
            </div>

            <!-- CENTER: score / entry -->
            <div class="msv__center">
              <template v-if="m.status === 'completed'">
                <span class="msv__score" :class="{ 'is-win': (m.score_a ?? 0) > (m.score_b ?? 0) }">
                  <LiCountUp :end-val="m.score_a ?? 0" :duration="500" />
                </span>
                <span class="msv__colon">:</span>
                <span class="msv__score" :class="{ 'is-win': (m.score_b ?? 0) > (m.score_a ?? 0) }">
                  <LiCountUp :end-val="m.score_b ?? 0" :duration="500" />
                </span>
              </template>
              <template v-else>
                <div class="msv__entry">
                  <input type="number" class="msv__score-input" v-model.number="scoreOf(m).a" placeholder="0" min="0" />
                  <span class="msv__colon">:</span>
                  <input type="number" class="msv__score-input" v-model.number="scoreOf(m).b" placeholder="0" min="0" />
                </div>
                <span class="msv__vs">VS</span>
              </template>
            </div>

            <!-- TEAM B -->
            <div class="msv__team msv__team--b" :class="winClass(m, 'b')">
              <div v-for="pid in m.team_b" :key="pid" class="msv__player">
                <span class="msv__avatar" :style="avatarStyle(pid)">
                  <img v-if="avatar(pid)" :src="avatar(pid)" :alt="name(pid)" />
                  <span v-else>{{ initials(pid) }}</span>
                </span>
                <span class="msv__pname">{{ name(pid) }}</span>
              </div>
            </div>
          </div>

          <footer v-if="m.status !== 'completed'" class="msv__match-foot">
            <button type="button" class="msv__finalize" @click="handleFinalize(m)">Finalize score</button>
          </footer>
        </article>
      </div>
    </section>

    <section v-if="standings.length" class="msv__standings">
      <h2>Standings</h2>
      <div class="msv__standings-scroll">
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>±</th></tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in standings" :key="s.player_id" :class="{ 'msv__row--top': i === 0 }">
              <td><span class="msv__rank" :data-rank="i + 1">{{ i + 1 }}</span></td>
              <td>
                <span class="msv__rank-name">
                  <span class="msv__avatar msv__avatar--sm" :style="avatarStyle(s.player_id)">
                    <img v-if="avatar(s.player_id)" :src="avatar(s.player_id)" :alt="name(s.player_id)" />
                    <span v-else>{{ initials(s.player_id) }}</span>
                  </span>
                  {{ playerName(s.player_id) }}
                </span>
              </td>
              <td><LiCountUp :end-val="s.played" :duration="600" /></td>
              <td class="msv__w"><LiCountUp :end-val="s.won" :duration="600" /></td>
              <td class="msv__l"><LiCountUp :end-val="s.lost" :duration="600" /></td>
              <td><LiCountUp :end-val="s.points_for" :duration="600" /></td>
              <td><LiCountUp :end-val="s.points_against" :duration="600" /></td>
              <td :class="diffClass(s)"><LiCountUp :end-val="diff(s)" :duration="600" /></td>
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
import { LiIcon, LiCountUp, useToast } from '../../design-system/components/index.js'
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

const playerById = computed(() => {
  const m = new Map()
  for (const p of participants.value) {
    m.set(p.id, { full_name: p.profiles?.full_name || p.guest_name, avatar_url: p.profiles?.avatar_url || '' })
  }
  return m
})
const playerIds = computed(() => participants.value.map((p) => p.id))
const standings = computed(() =>
  session.value ? computeStandingsFor(rounds.value, playerIds.value, session.value.ranking_criteria) : []
)

function name(id) { return playerById.value.get(id)?.full_name || String(id).slice(0, 4) }
function playerName(id) { return name(id) }
function avatar(id) { return playerById.value.get(id)?.avatar_url || '' }
function initials(id) {
  const n = name(id)
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'
}
// Deterministic hue from the player id so avatars are distinct without extra state.
function avatarStyle(id) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360
  return { background: `hsl(${h}, 42%, 32%)` }
}

function stateLabel(m) {
  if (m.status === 'completed') return 'Final'
  if (m.status === 'in_progress') return 'Live'
  return 'Pending'
}
function winClass(m, side) {
  if (m.status !== 'completed') return ''
  const a = m.score_a ?? 0
  const b = m.score_b ?? 0
  if (a === b) return ''
  const won = side === 'a' ? a > b : b > a
  return won ? 'is-win' : 'is-loss'
}
function diff(s) { return (s.points_for ?? 0) - (s.points_against ?? 0) }
function diffClass(s) {
  const d = diff(s)
  return d > 0 ? 'msv__diff--pos' : d < 0 ? 'msv__diff--neg' : ''
}

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

function hapticTick() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(15)
  }
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
  rounds.value = await listRoundsWithMatches(session.value.id, participants.value)
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
    await generateRound(session.value, buildRoundInput(session.value.format, playerIds.value), nextRound, participants.value)
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
  hapticTick()
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

/* ─── head ─── */
.msv__head { display: flex; align-items: flex-start; gap: var(--space-m, 12px); }
.msv__head-text { flex: 1; min-width: 0; }
.msv__title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
.msv__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border: none; background: var(--color-surface-panel, #1E1E1E); color: var(--color-on-surface, #FFFFFF);
  cursor: pointer; border-radius: 50%; flex-shrink: 0;
}
.msv__x:hover { background: var(--color-surface-panel-hover, #2A2A2A); }
.msv__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.msv__chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px;
  font-size: 12px; font-weight: 600; background: var(--color-surface-panel, #1E1E1E); color: var(--color-chip-text, #DDD);
}
.msv__chip--format { background: rgba(255,175,3,0.14); color: var(--color-brand); }
.msv__chip[data-variant="in_progress"] { background: rgba(16,185,129,0.18); color: #34D399; }
.msv__chip[data-variant="completed"] { background: rgba(255,255,255,0.08); color: var(--color-gray-700, #CCC); }
.msv__chip--code { background: rgba(255,255,255,0.06); color: var(--color-brand); border: 1px dashed rgba(255,175,3,0.4); }
.msv__dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; box-shadow: 0 0 0 0 rgba(52,211,153,0.6); animation: msv-pulse 1.6s infinite; }
@keyframes msv-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
  70% { box-shadow: 0 0 0 6px rgba(52,211,153,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
}

/* ─── CTA ─── */
.msv__cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: none; cursor: pointer; font: inherit; font-weight: 700; border-radius: 14px;
  background: var(--color-brand); color: #1A1A1A; padding: 14px 18px;
  transition: filter var(--dur-short) var(--ease-out);
}
.msv__cta:hover { filter: brightness(1.05); }
.msv__empty { color: var(--color-gray-600, #A3A3A3); font-size: 14px; margin: 0; }

/* ─── round ─── */
.msv__round { display: flex; flex-direction: column; gap: 10px; }
.msv__round-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px; }
.msv__round-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--color-gray-600, #A3A3A3); text-transform: uppercase; letter-spacing: 0.06em; }
.msv__round-meta { font-size: 12px; color: var(--color-gray-500, #6B6B6B); }
.msv__round-grid { display: flex; flex-direction: column; gap: 10px; }

/* ─── match card ─── */
.msv__match {
  background: var(--color-surface-panel-deep, #181818); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;
}
.msv__match[data-state="completed"] { background: var(--color-surface-panel-deepest, #161616); }

.msv__match-bar { display: flex; align-items: center; justify-content: space-between; }
.msv__court { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--color-on-surface-muted, #B0B0B0); }
.msv__court :deep(.li-icon) { color: var(--color-brand); }
.msv__pill {
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.07); color: var(--color-on-surface-muted, #B0B0B0);
}
.msv__pill[data-state="in_progress"] { background: rgba(16,185,129,0.2); color: #34D399; }
.msv__pill[data-state="completed"] { background: rgba(255,175,3,0.16); color: var(--color-brand); }

/* board: team-A | center | team-B */
.msv__board { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }

.msv__team { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.msv__team--b { align-items: flex-end; }
.msv__player { display: flex; align-items: center; gap: 8px; min-width: 0; }
.msv__team--b .msv__player { flex-direction: row-reverse; }
.msv__pname {
  font-size: 13px; font-weight: 600; color: var(--color-pname-text, #C8C8C8); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 110px;
}
.msv__team.is-win .msv__pname { color: var(--color-on-surface, #FFFFFF); font-weight: 800; }
.msv__team.is-loss .msv__pname { color: var(--color-gray-500, #6B6B6B); }

.msv__avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: var(--color-on-surface, #FFFFFF); overflow: hidden;
  border: 2px solid rgba(255,255,255,0.1);
}
.msv__avatar img { width: 100%; height: 100%; object-fit: cover; }
.msv__avatar--sm { width: 24px; height: 24px; font-size: 10px; border-width: 1.5px; }
.msv__team.is-win .msv__avatar { border-color: var(--color-brand); box-shadow: 0 0 0 1px rgba(255,175,3,0.3); }

/* center score */
.msv__center { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 72px; }
.msv__score { font-size: 30px; font-weight: 800; color: var(--color-score-muted, #888); font-variant-numeric: tabular-nums; line-height: 1; }
.msv__score.is-win { color: var(--color-brand); }
.msv__colon { font-size: 20px; font-weight: 700; color: var(--color-score-dim, #555); line-height: 1; }
.msv__vs { font-size: 10px; font-weight: 700; color: var(--color-gray-500, #6B6B6B); letter-spacing: 0.1em; }

.msv__entry { display: flex; align-items: center; gap: 6px; }
.msv__score-input {
  width: 44px; padding: 7px 0; text-align: center; font: inherit; font-weight: 800; font-size: 18px;
  color: var(--color-on-surface, #FFFFFF); background: var(--color-gray-950, #0E0E0E); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px;
}
.msv__score-input:focus { outline: none; border-color: var(--color-brand); }
.msv__score-input::placeholder { color: var(--color-score-dim, #555); }
/* hide spinner */
.msv__score-input::-webkit-outer-spin-button, .msv__score-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.msv__score-input { -moz-appearance: textfield; }

.msv__match-foot { display: flex; justify-content: center; }
.msv__finalize {
  border: none; cursor: pointer; font: inherit; font-weight: 700; font-size: 13px;
  padding: 8px 18px; border-radius: 999px; background: rgba(255,175,3,0.14); color: var(--color-brand);
  transition: background var(--dur-short) var(--ease-out);
}
.msv__finalize:hover { background: rgba(255,175,3,0.24); }

/* ─── standings ─── */
.msv__standings { background: var(--color-surface-panel-deep, #181818); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
.msv__standings h2 { margin: 0 0 12px; font-size: 15px; font-weight: 800; }
.msv__standings-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.msv__standings table { width: 100%; border-collapse: collapse; }
.msv__standings th, .msv__standings td { padding: 9px 8px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
.msv__standings th { color: var(--color-score-muted, #888); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
.msv__standings th:nth-child(2), .msv__standings td:nth-child(2) { text-align: left; }
.msv__standings td { color: var(--color-chip-text, #DDD); font-variant-numeric: tabular-nums; }
.msv__standings tbody tr:last-child td { border-bottom: none; }
.msv__rank {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%; font-size: 11px; font-weight: 800;
  background: rgba(255,255,255,0.07); color: var(--color-gray-700, #CCC);
}
.msv__rank[data-rank="1"] { background: var(--color-brand); color: #1A1A1A; }
.msv__rank[data-rank="2"] { background: rgba(192,192,192,0.25); color: #E0E0E0; }
.msv__rank[data-rank="3"] { background: rgba(205,127,50,0.3); color: #E8B98C; }
.msv__rank-name { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--color-gray-800, #EEE); }
.msv__row--top td { color: var(--color-brand); font-weight: 800; }
.msv__w { color: #34D399; font-weight: 700; }
.msv__l { color: #999; }
.msv__diff--pos { color: #34D399; font-weight: 700; }
.msv__diff--neg { color: #F87171; }

@media (prefers-reduced-motion: reduce) {
  .msv__dot { animation: none; }
}
</style>
