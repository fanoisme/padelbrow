<template>
  <section v-if="session" class="match-session-view">
    <LiPageHeader title="Match session">
      <template #actions>
        <LiBadge :label="session.format" variant="brand" />
        <LiBadge :label="session.status" :variant="statusVariant(session.status)" />
      </template>
    </LiPageHeader>

    <div class="match-session-view__actions">
      <LiButton data-testid="generate-round-btn" @click="handleGenerateRound">Generate next round</LiButton>
    </div>

    <LiCard v-for="round in rounds" :key="round.id" flush class="match-session-view__round">
      <h3 class="match-session-view__round-title">Round {{ round.round_number + 1 }}</h3>
      <LiListTile
        v-for="m in round.matches"
        :key="m.id"
        :title="`Court ${m.court_number}`"
        :subtitle="`${m.team_a.join(' / ')} vs ${m.team_b.join(' / ')}`"
      >
        <template #trailing>
          <span v-if="m.status === 'completed'" class="match-session-view__score">{{ m.score_a }}-{{ m.score_b }}</span>
          <div v-else class="match-session-view__score-entry">
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).a" placeholder="0" />
            <input type="number" class="match-session-view__score-input" v-model.number="scoreOf(m).b" placeholder="0" />
            <LiButton size="sm" @click="handleFinalize(m)">Finalize</LiButton>
          </div>
        </template>
      </LiListTile>
    </LiCard>

    <div class="match-session-view__standings">
      <h2>Standings</h2>
      <div class="match-session-view__standings-scroll">
        <table>
          <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in standings" :key="s.player_id">
              <td>{{ i + 1 }}</td><td>{{ s.player_id }}</td>
              <td>{{ s.played }}</td><td>{{ s.won }}</td><td>{{ s.lost }}</td>
              <td>{{ s.points_for }}</td><td>{{ s.points_against }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section v-else class="match-session-view match-session-view__setup">
    <LiPageHeader title="New match session" />
    <LiGlassCard class="match-session-view__setup-card">
      <LiSelect
        v-model="setup.format"
        label="Format"
        :options="[
          { value: 'americano', label: 'Americano' },
          { value: 'mexicano', label: 'Mexicano' },
          { value: 'team_americano', label: 'Team Americano' },
          { value: 'singles', label: 'Singles' },
        ]"
      />
      <LiSelect
        v-model="setup.ranking_criteria"
        label="Ranking by"
        :options="[
          { value: 'matches_won', label: 'Matches won' },
          { value: 'points_won', label: 'Points won' },
          { value: 'win_pct', label: 'Win %' },
          { value: 'points_pct', label: 'Points %' },
        ]"
      />
      <label class="match-session-view__field">
        Courts
        <input type="number" min="1" v-model.number="setup.num_courts" />
      </label>
      <label class="match-session-view__field">
        Points per set
        <input type="number" min="1" v-model.number="setup.total_set_points" />
      </label>
      <LiButton data-testid="create-session-btn" :loading="creating" @click="handleCreate">Create session</LiButton>
    </LiGlassCard>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LiButton, LiBadge, LiCard, LiGlassCard, LiListTile, LiSelect, LiPageHeader, useToast } from '../../design-system/components/index.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import { useMatchRounds } from '../../composables/useMatchRounds.js'
import { useMatchScoring } from '../../composables/useMatchScoring.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getSession, createSession, setStatus } = useMatchSessions()
const { generateRound, listRoundsWithMatches } = useMatchRounds()
const { enterScore, finalizeMatch, computeStandingsFor } = useMatchScoring()
const { listParticipants } = useMeetParticipants()

const session = ref(null)
const rounds = ref([])
const participants = ref([])
const scoreCache = reactive({})
const creating = ref(false)
const setup = ref({ format: 'americano', ranking_criteria: 'matches_won', num_courts: 1, total_set_points: 21 })

const playerIds = computed(() => participants.value.map((p) => p.user_id))
const standings = computed(() =>
  session.value ? computeStandingsFor(rounds.value, playerIds.value, session.value.ranking_criteria) : []
)

function scoreOf(m) {
  if (!scoreCache[m.id]) scoreCache[m.id] = { a: m.score_a ?? '', b: m.score_b ?? '' }
  return scoreCache[m.id]
}

async function reload() {
  rounds.value = await listRoundsWithMatches(session.value.id)
}

onMounted(async () => {
  // No sessionId → show the setup form (session stays null). Only load when a
  // session id is present, so the create flow doesn't 404 on getSession(undefined).
  if (!route.params.sessionId) return
  try {
    session.value = await getSession(route.params.sessionId)
    participants.value = await listParticipants(route.params.meetId)
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load the match session.')
  }
})

async function handleCreate() {
  creating.value = true
  try {
    const created = await createSession(setup.value, route.params.meetId)
    router.push({ name: 'match-session', params: { meetId: route.params.meetId, sessionId: created.id } })
  } catch (err) {
    toast.error(err.message || 'Could not create the session.')
  } finally {
    creating.value = false
  }
}

async function handleGenerateRound() {
  try {
    const nextRound = rounds.value.length
    await generateRound(session.value, { playerIds: playerIds.value }, nextRound)
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

function statusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  return 'neutral'
}
</script>

<style scoped>
.match-session-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.match-session-view__actions { display: flex; }
.match-session-view__round { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.match-session-view__round-title {
  padding: var(--space-m, 16px) var(--space-m, 16px) 0;
}
.match-session-view__round :deep(.li-list-tile-subtitle) {
  -webkit-line-clamp: unset;
  overflow: visible;
  white-space: normal;
}
.match-session-view__score-entry { display: flex; align-items: center; gap: var(--space-xs, 4px); }
.match-session-view__score-input { width: 56px; padding: var(--space-xs, 4px); border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px); }
.match-session-view__standings-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.match-session-view__standings table { width: 100%; border-collapse: collapse; }
.match-session-view__standings th, .match-session-view__standings td { padding: var(--space-s, 8px); text-align: left; border-bottom: 1px solid var(--color-gray-200, #E6E6E6); }
.match-session-view__setup-card { display: flex; flex-direction: column; gap: var(--space-m, 16px); max-width: 480px; margin: 0 auto; }
.match-session-view__field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); font-size: var(--text-xs, 14px); font-weight: 500; color: var(--color-gray-800, #4D4D4D); }
.match-session-view__field input { padding: 12px 16px; border: 1.5px solid var(--color-gray-300, #CCCCCC); border-radius: var(--radius-sm, 4px); font-size: var(--text-sm, 16px); }
</style>
