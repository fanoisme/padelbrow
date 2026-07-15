<template>
  <section v-if="comp" class="comp-detail-view">
    <LiPageHeader :title="comp.name">
      <template #actions>
        <LiBadge :label="comp.status" :variant="statusVariant(comp.status)" />
        <LiButton v-if="isOrganizer && comp.status === 'draft'" @click="handleOpenRegistration">Open registration</LiButton>
        <LiButton
          v-if="isOrganizer && comp.status === 'registration_open'"
          :disabled="confirmedTeams.length < 2"
          @click="handleGenerate"
        >
          Generate matches
        </LiButton>
      </template>
    </LiPageHeader>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="comp-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <LiCard>
          <p>Format: {{ comp.format }}</p>
          <p v-if="comp.registration_opens_at">Registration opens: {{ formatWhen(comp.registration_opens_at) }}</p>
          <p v-if="comp.registration_closes_at">Registration closes: {{ formatWhen(comp.registration_closes_at) }}</p>
        </LiCard>
      </div>

      <!-- Teams -->
      <div v-show="activeTab === 1">
        <LiGlassCard class="comp-detail-view__register">
          <form @submit.prevent="handleRegister">
            <LiTextField v-model="newTeam.name" placeholder="Team name" />
            <LiTextField v-model="newTeam.players" placeholder="Player IDs, comma-separated" />
            <LiButton type="submit" :loading="registering">Register team</LiButton>
          </form>
        </LiGlassCard>
        <LiCard flush>
          <LiListTile v-for="reg in registrations" :key="reg.team_id" :title="reg.competition_teams.name">
            <template #trailing>
              <LiBadge v-if="reg.status === 'confirmed'" :label="`Seed ${reg.seed}`" variant="success" />
              <LiBadge v-else label="Pending" variant="warning" />
              <LiButton v-if="reg.status === 'pending' && isOrganizer" size="sm" @click="handleConfirm(reg)">Confirm + seed</LiButton>
            </template>
          </LiListTile>
        </LiCard>
      </div>

      <!-- Standings (round_robin): matches with score entry + standings table -->
      <div v-show="activeTab === 2 && comp.format === 'round_robin'">
        <div v-if="matches.length" class="comp-detail-view__rounds">
          <LiCard v-for="round in matchesByRound" :key="round.name" flush class="comp-detail-view__round">
            <h3 class="comp-detail-view__round-title">{{ round.name }}</h3>
            <LiListTile
              v-for="m in round.matches"
              :key="m.id"
              :title="`${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`"
            >
              <template #trailing>
                <span v-if="m.status === 'completed'" class="comp-detail-view__match-score">{{ m.score_a }}-{{ m.score_b }}</span>
                <div v-else-if="isOrganizer && m.team_a_id && m.team_b_id" class="comp-detail-view__score">
                  <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
                  <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
                  <LiButton size="sm" @click="handleScore(m)">Save</LiButton>
                </div>
              </template>
            </LiListTile>
          </LiCard>
        </div>
        <div class="comp-detail-view__standings-scroll">
          <table class="comp-detail-view__standings-table">
            <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in standings" :key="s.team_id">
                <td>{{ i + 1 }}</td>
                <td>{{ teamName(s.team_id) }}</td>
                <td>{{ s.played }}</td><td>{{ s.won }}</td><td>{{ s.lost }}</td>
                <td>{{ s.points_for }}</td><td>{{ s.points_against }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bracket (single_elim) -->
      <div v-show="activeTab === 2 && comp.format === 'single_elim'">
        <LiCard v-for="round in matchesByRound" :key="round.name" flush class="comp-detail-view__round">
          <h3 class="comp-detail-view__round-title">{{ round.name }}</h3>
          <LiListTile
            v-for="m in round.matches"
            :key="m.id"
            :title="`${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`"
          >
            <template #trailing>
              <span v-if="m.status === 'completed'" class="comp-detail-view__match-score">{{ m.score_a }}-{{ m.score_b }}</span>
              <div v-else-if="isOrganizer && m.team_a_id && m.team_b_id" class="comp-detail-view__score">
                <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
                <input type="number" class="comp-detail-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
                <LiButton size="sm" @click="handleScore(m)">Save</LiButton>
              </div>
            </template>
          </LiListTile>
        </LiCard>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiTabs, LiButton, LiBadge, LiTextField, LiCard, LiGlassCard, LiListTile, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useCompetitions } from '../../composables/useCompetitions.js'
import { useCompetitionRegistrations } from '../../composables/useCompetitionRegistrations.js'
import { useCompetitionMatches } from '../../composables/useCompetitionMatches.js'

const route = useRoute()
const { user } = useAuth()
const { getMyMembership } = useClubs()
const { getCompetition, openRegistration, generateMatches } = useCompetitions()
const { listRegistrations, registerTeam, confirmRegistration } = useCompetitionRegistrations()
const { listMatches, enterScore, computeStandingsFor } = useCompetitionMatches()
const toast = useToast()

const comp = ref(null)
const registrations = ref([])
const matches = ref([])
const activeTab = ref(0)
const newTeam = ref({ name: '', players: '' })
const registering = ref(false)
// best-effort organizer flag for UX (hide organizer-only controls); RLS is the real gate.
const isOrganizer = ref(false)
// Per-match score-input cache, lazily created on first render of each match.
const scoreCache = reactive({})

// ponytail: LiTabs expects tabs as [{ label }], not bare strings — adjusted from brief's string array to match the vendored component's real API.
const tabs = computed(() => [
  { label: 'Details' },
  { label: 'Teams' },
  { label: comp.value?.format === 'single_elim' ? 'Bracket' : 'Standings' },
])

const confirmedTeams = computed(() =>
  registrations.value
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    .map((r) => ({ id: r.team_id }))
)

const standings = computed(() =>
  computeStandingsFor(matches.value, registrations.value.map((r) => r.team_id))
)

// round_name comes back alphabetically from the DB; derive a display ordinal so
// rounds render in bracket/league order (Quarterfinal → Semifinal → Final,
// Round 1 → Round 2 → … → Round 10). ponytail: tied to bracketRoundName +
// generateRoundRobin naming conventions; replace with a round_index column if
// round names ever diverge.
function roundOrdinal(name) {
  if (name === 'Final') return 1e6
  if (name === 'Semifinal') return 1e6 - 1
  if (name === 'Quarterfinal') return 1e6 - 2
  const of = name.match(/Round of (\d+)/)
  if (of) return -parseInt(of[1], 10)
  const r = name.match(/Round (\d+)/)
  if (r) return parseInt(r[1], 10)
  return 0
}

const matchesByRound = computed(() => {
  const byRound = {}
  for (const m of matches.value) {
    byRound[m.round_name] = byRound[m.round_name] || { name: m.round_name, matches: [] }
    byRound[m.round_name].matches.push(m)
  }
  return Object.values(byRound).sort((a, b) => roundOrdinal(a.name) - roundOrdinal(b.name))
})

function teamName(id) {
  if (!id) return 'TBD'
  const reg = registrations.value.find((r) => r.team_id === id)
  return reg ? reg.competition_teams.name : '—'
}

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

async function reload() {
  registrations.value = await listRegistrations(route.params.id)
  matches.value = await listMatches(route.params.id)
}

onMounted(async () => {
  try {
    comp.value = await getCompetition(route.params.id)
    await reload()
    if (user.value && comp.value) {
      try {
        const membership = await getMyMembership(comp.value.club_id, user.value.id)
        isOrganizer.value = membership?.role === 'owner' || membership?.role === 'organizer'
      } catch {
        isOrganizer.value = false
      }
    }
  } catch (err) {
    toast.error(err.message || 'Could not load this competition.')
  }
})

async function handleOpenRegistration() {
  try {
    comp.value = await openRegistration(route.params.id)
  } catch (err) {
    toast.error(err.message || 'Could not open registration.')
  }
}

async function handleGenerate() {
  try {
    await generateMatches(comp.value, confirmedTeams.value)
    matches.value = await listMatches(route.params.id)
    comp.value = await getCompetition(route.params.id)
    toast.success('Matches generated.')
  } catch (err) {
    toast.error(err.message || 'Could not generate matches.')
  }
}

async function handleRegister() {
  if (!newTeam.value.name.trim()) return
  registering.value = true
  try {
    const playerIds = newTeam.value.players.split(',').map((s) => s.trim()).filter(Boolean)
    await registerTeam(route.params.id, { name: newTeam.value.name.trim(), playerIds })
    newTeam.value = { name: '', players: '' }
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not register the team.')
  } finally {
    registering.value = false
  }
}

async function handleConfirm(reg) {
  // Next seed = (max confirmed seed) + 1
  const nextSeed = registrations.value.reduce((mx, r) => Math.max(mx, r.seed ?? 0), 0) + 1
  try {
    await confirmRegistration(route.params.id, reg.team_id, nextSeed)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not confirm the team.')
  }
}

async function handleScore(m) {
  const inputs = scoreOf(m)
  const a = inputs.a === '' ? null : Number(inputs.a)
  const b = inputs.b === '' ? null : Number(inputs.b)
  try {
    await enterScore(m.id, a, b)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not save the score.')
  }
}

function statusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  if (status === 'registration_open') return 'brand'
  return 'neutral'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.comp-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.comp-detail-view__register {
  margin-bottom: var(--space-m, 16px);
}

.comp-detail-view__register form {
  display: flex;
  gap: var(--space-s, 8px);
}

.comp-detail-view__round {
  margin-bottom: var(--space-s, 8px);
}

.comp-detail-view__round-title {
  padding: var(--space-m, 16px) var(--space-m, 16px) 0;
  margin: 0 0 var(--space-s, 8px);
}

/* Team names can be longer than LiListTile's default single-line
   ellipsis assumes (built for dense contact-style lists) — always show
   the full matchup in this competitions-round context. */
.comp-detail-view__round :deep(.li-list-tile-title) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.comp-detail-view__match-score {
  font-weight: 600;
}

.comp-detail-view__score {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 4px);
}

.comp-detail-view__score-input {
  width: 56px;
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border: 1px solid var(--color-gray-300, #CCC);
  border-radius: var(--radius-s, 6px);
  font-size: var(--text-sm, 14px);
}

.comp-detail-view__standings-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: var(--space-m, 16px);
}

.comp-detail-view__standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs, 14px);
}

.comp-detail-view__standings-table th,
.comp-detail-view__standings-table td {
  padding: var(--space-s, 8px);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-200, #E6E6E6);
}
</style>
