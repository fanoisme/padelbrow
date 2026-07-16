<template>
  <CreateMatchFlow standalone @create="handleCreate" @close="router.back()" />
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import CreateMatchFlow from '../matches/CreateMatchFlow.vue'

const router = useRouter()
const toast = useToast()
const { user } = useAuth()
const { createMeet } = useMeets()
const { createSession } = useMatchSessions()

const meetFormatMap = {
  americano: 'americano',
  mexicano: 'mexicano',
  team_americano: 'americano',
  team_mexicano: 'mexicano',
}

async function handleCreate({ basics, format, num_courts, total_set_points, ranking_criteria, prioritize_least_matches }) {
  try {
    const meet = await createMeet({
      title: basics.title,
      venue_name: basics.venue_name || null,
      starts_at: basics.starts_at ? new Date(basics.starts_at).toISOString() : null,
      duration_minutes: basics.duration_hours * 60,
      sport: 'padel',
      format: meetFormatMap[format] || 'social',
      max_players: 4,
      privacy: 'public',
      fee_amount: 0,
      host_role: 'host_and_play',
      auto_approve: false,
      allow_plus_one: true,
    }, user.value.id)

    const session = await createSession({
      format,
      ranking_criteria,
      num_courts,
      total_set_points,
      prioritize_least_matches,
    }, meet.id)

    router.push({ name: 'match-session', params: { meetId: meet.id, sessionId: session.id } })
  } catch (err) {
    toast.error(err.message || 'Could not create the meet.')
  }
}
</script>
