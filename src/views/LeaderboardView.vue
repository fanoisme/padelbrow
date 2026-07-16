<template>
  <section class="leaderboard-view">
    <LiPageHeader title="Leaderboard" subtitle="Global rankings across every match played.">
      <template #actions>
        <LiButton data-testid="export-png" :loading="exporting" @click="handleExport">Export PNG</LiButton>
      </template>
    </LiPageHeader>

    <div ref="standingsRef" class="leaderboard-view__standings">
      <Podium v-if="rows.length >= 3" :players="rows.slice(0, 3)" />
      <LiCard flush>
        <LiListTile
          v-for="(r, i) in rows.slice(3)"
          :key="r.user_id"
          :title="r.user?.full_name"
          :subtitle="`${r.matches_played} played`"
          class="leaderboard-view__row"
          :class="{ 'leaderboard-view__row--me': r.user_id === user?.id }"
        >
          <template #leading>
            <span class="leaderboard-view__rank">{{ i + 4 }}</span>
          </template>
          <template #trailing>
            <span class="leaderboard-view__rating">{{ Number(r.rating).toFixed(1) }}</span>
          </template>
        </LiListTile>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiListTile, LiPageHeader, useToast } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useStats } from '../composables/useStats.js'
import { toPng } from 'html-to-image'
import Podium from '../components/stats/Podium.vue'

const toast = useToast()
const { user } = useAuth()
const { getLeaderboard } = useStats()

const rows = ref([])
const standingsRef = ref(null)
const exporting = ref(false)

onMounted(async () => {
  try {
    rows.value = await getLeaderboard()
  } catch (err) {
    toast.error(err.message || 'Could not load the leaderboard.')
  }
})

async function handleExport() {
  if (!standingsRef.value) return
  exporting.value = true
  try {
    const dataUrl = await toPng(standingsRef.value, { cacheBust: true })
    const link = document.createElement('a')
    link.download = 'leaderboard.png'
    link.href = dataUrl
    link.click()
    toast.success('Exported.')
  } catch (err) {
    toast.error(err.message || 'Could not export.')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.leaderboard-view { display: flex; flex-direction: column; gap: var(--space-l, 24px); }
.leaderboard-view__standings { display: flex; flex-direction: column; gap: var(--space-m, 16px); background: var(--color-surface, #121212); padding: var(--space-m, 16px); border-radius: var(--radius-lg, 24px); }
.leaderboard-view__standings .leaderboard-view__row--me { background: var(--color-warning-container, #2E1A00); font-weight: 600; }
.leaderboard-view__rank { opacity: 0.6; font-weight: 700; min-width: 24px; text-align: center; }
.leaderboard-view__rating { font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
