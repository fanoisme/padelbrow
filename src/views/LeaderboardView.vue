<template>
  <section class="leaderboard-view">
    <div class="leaderboard-view__head">
      <h1>Leaderboard</h1>
      <LiButton data-testid="export-png" :loading="exporting" @click="handleExport">Export PNG</LiButton>
    </div>

    <div ref="standingsRef" class="leaderboard-view__standings">
      <Podium v-if="rows.length >= 3" :players="rows.slice(0, 3)" />
      <ul class="leaderboard-view__list">
        <li
          v-for="(r, i) in rows.slice(3)"
          :key="r.user_id"
          class="leaderboard-view__row"
          :class="{ 'leaderboard-view__row--me': r.user_id === user?.id }"
        >
          <span class="leaderboard-view__rank">{{ i + 4 }}</span>
          <span class="leaderboard-view__name">{{ r.user?.full_name }}</span>
          <span class="leaderboard-view__rating">{{ Number(r.rating).toFixed(1) }}</span>
          <span class="leaderboard-view__played">{{ r.matches_played }} played</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, useToast } from '../design-system/components/index.js'
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
.leaderboard-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.leaderboard-view__head { display: flex; align-items: center; justify-content: space-between; }
.leaderboard-view__standings { display: flex; flex-direction: column; gap: var(--space-m, 16px); background: var(--color-surface, #fff); padding: var(--space-m, 16px); border-radius: var(--radius-m, 12px); }
.leaderboard-view__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.leaderboard-view__row { display: grid; grid-template-columns: 2rem 1fr auto auto; gap: var(--space-s, 8px); align-items: center; padding: var(--space-s, 8px); border-radius: var(--radius-s, 6px); }
.leaderboard-view__row--me { background: var(--color-brand-50, #eef); font-weight: 600; }
.leaderboard-view__rank { opacity: 0.6; }
.leaderboard-view__rating { font-weight: 600; }
.leaderboard-view__played { opacity: 0.6; font-size: 0.85rem; }
</style>
