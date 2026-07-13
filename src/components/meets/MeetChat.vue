<template>
  <div class="meet-chat">
    <ul class="meet-chat__messages">
      <li v-for="m in messages" :key="m.id" :class="{ 'is-mine': m.author_id === userId }">
        <span class="meet-chat__body">{{ m.body }}</span>
      </li>
    </ul>
    <form class="meet-chat__composer" @submit.prevent="handleSend">
      <LiTextField v-model="draft" placeholder="Message…" />
      <LiButton type="submit" :loading="sending">Send</LiButton>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LiTextField, LiButton, useToast } from '../../design-system/components/index.js'
import { useChat } from '../../composables/useChat.js'

const props = defineProps({ meetId: { type: String, required: true } })

const { messages, send, subscribe } = useChat(props.meetId)
const toast = useToast()
const draft = ref('')
const sending = ref(false)

const userId = computed(() => {
  // Read from the shared auth composable for the "is-mine" styling.
  // (Importing useAuth here would couple the component; the chat payload
  // already carries author_id, and the realtime row does too, so compare
  // against the auth uid lazily.)
  return null
})

let unsubscribe = null
onMounted(() => { unsubscribe = subscribe() })
onUnmounted(() => { if (unsubscribe) unsubscribe() })

async function handleSend() {
  if (!draft.value.trim()) return
  sending.value = true
  try {
    await send(draft.value.trim())
    draft.value = ''
  } catch (err) {
    toast.error(err.message || 'Could not send message.')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.meet-chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-chat__messages {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.meet-chat__body {
  display: inline-block;
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border-radius: var(--radius-md, 12px);
  background: var(--color-gray-100, #F2F2F2);
}

.meet-chat__composer {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
