<template>
  <div class="notifications-bell">
    <button class="notifications-bell__button" @click="toggle" aria-label="Notifications">
      <LiIcon name="notifications" />
      <span v-if="unreadCount > 0" class="notifications-bell__badge">{{ unreadCount }}</span>
    </button>
    <div v-if="open" class="notifications-bell__panel">
      <p v-if="notifications.length === 0" class="notifications-bell__empty">No notifications</p>
      <ul v-else>
        <li v-for="n in notifications" :key="n.id" :class="{ 'is-unread': !n.read_at }">
          {{ describe(n) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { LiIcon, useToast } from '../../design-system/components/index.js'
import { useNotifications } from '../../composables/useNotifications.js'

const { notifications, unreadCount, markAllRead, subscribe } = useNotifications()
const toast = useToast()
const open = ref(false)
let unsubscribe = null

onMounted(() => { unsubscribe = subscribe() })
onUnmounted(() => { if (unsubscribe) unsubscribe() })

async function toggle() {
  open.value = !open.value
  if (open.value && unreadCount.value > 0) {
    try {
      await markAllRead()
    } catch (err) {
      toast.error(err.message || 'Could not mark notifications read.')
    }
  }
}

function describe(n) {
  const p = n.payload || {}
  if (n.type === 'meet_join') return `${p.participant_name || 'Someone'} joined ${p.meet_title || 'your meet'}`
  if (n.type === 'waitlist_promoted') return `You were promoted off the waitlist for ${p.meet_title || 'a meet'}`
  return 'New notification'
}
</script>

<style scoped>
.notifications-bell {
  position: relative;
}

.notifications-bell__button {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-gray-800, #4D4D4D);
}

.notifications-bell__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-red-500, #A33129);
  color: #fff;
  font-size: 10px;
  border-radius: var(--radius-pill, 999px);
  padding: 0 4px;
}

.notifications-bell__panel {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-gray-200, #E6E6E6);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-width: 260px;
  padding: var(--space-s, 8px);
  z-index: 10;
}

.notifications-bell__panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.notifications-bell__panel li {
  padding: var(--space-s, 8px);
  border-radius: var(--radius-sm, 8px);
  font-size: var(--text-xs, 14px);
}

.notifications-bell__panel li.is-unread {
  background: var(--color-gray-100, #F2F2F2);
  font-weight: 600;
}

.notifications-bell__empty {
  padding: var(--space-s, 8px);
  color: var(--color-gray-500, #999999);
  font-size: var(--text-xs, 14px);
}
</style>
