<template>
  <div class="podium" v-if="players.length">
    <div class="podium__step podium__step--silver" v-if="players[1]">
      <span class="podium__medal">2</span>
      <span class="podium__name">{{ players[1].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[1].rating).toFixed(1) }}</span>
    </div>
    <div class="podium__step podium__step--gold" v-if="players[0]">
      <span class="podium__medal">1</span>
      <span class="podium__name">{{ players[0].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[0].rating).toFixed(1) }}</span>
    </div>
    <div class="podium__step podium__step--bronze" v-if="players[2]">
      <span class="podium__medal">3</span>
      <span class="podium__name">{{ players[2].user?.full_name }}</span>
      <span class="podium__rating">{{ Number(players[2].rating).toFixed(1) }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ players: { type: Array, default: () => [] } })
</script>

<style scoped>
.podium { display: flex; align-items: flex-end; justify-content: center; gap: var(--space-s, 8px); }
.podium__step { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs, 4px); padding: var(--space-m, 16px); border-radius: var(--radius-m, 12px); min-width: 96px; }
.podium__step--gold { background: linear-gradient(180deg, #FFD70033, #FFD70011); border: 2px solid #FFD700; transform: translateY(-12px); }
.podium__step--silver { background: linear-gradient(180deg, #C0C0C033, #C0C0C011); border: 2px solid #C0C0C0; }
.podium__step--bronze { background: linear-gradient(180deg, #CD7F3233, #CD7F3211); border: 2px solid #CD7F32; }
.podium__medal { font-weight: 700; font-size: 1.25rem; }
.podium__name { font-weight: 600; }
.podium__rating { font-size: 0.9rem; opacity: 0.8; }
</style>
