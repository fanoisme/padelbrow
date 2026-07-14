<template>
  <section class="feed-view">
    <LiPageHeader :title="clubId ? 'Club feed' : 'Feed'" />

    <LiGlassCard class="feed-view__composer">
      <LiTextField v-model="caption" type="area" placeholder="Share something…" />
      <input type="file" multiple accept="image/*,video/*" class="feed-view__file" @change="onFiles" />
      <LiButton :loading="posting" @click="handlePost">Post</LiButton>
    </LiGlassCard>

    <LiEmptyState v-if="posts.length === 0" title="No posts yet" icon="feed" />
    <LiRevealOnScroll v-else variant="fade-up" stagger>
      <div class="feed-view__list">
        <PostCard v-for="p in posts" :key="p.id" :post="p" @deleted="onDeleted" />
      </div>
    </LiRevealOnScroll>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiGlassCard, LiButton, LiEmptyState, LiPageHeader, LiRevealOnScroll, LiTextField, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useFeed } from '../../composables/useFeed.js'
import { useStorage } from '../../composables/useStorage.js'
import PostCard from '../../components/feed/PostCard.vue'

const props = defineProps({ clubId: { type: String, default: '' } })
const { user } = useAuth()
const { listFeed, createPost } = useFeed()
const { uploadFeedMedia } = useStorage()
const toast = useToast()

const caption = ref('')
const files = ref([])
const posts = ref([])
const posting = ref(false)

async function load() {
  try {
    posts.value = await listFeed(props.clubId || undefined)
  } catch (err) {
    toast.error(err.message || 'Could not load the feed.')
  }
}

onMounted(load)

function onFiles(e) {
  files.value = Array.from(e.target.files || [])
}

async function handlePost() {
  if (!caption.value.trim() && files.value.length === 0) return
  posting.value = true
  try {
    const mediaUrls = []
    for (const f of files.value) {
      mediaUrls.push(await uploadFeedMedia(f))
    }
    const post = await createPost({ caption: caption.value.trim(), mediaUrls, clubId: props.clubId || undefined }, user.value.id)
    posts.value.unshift(post)
    caption.value = ''
    files.value = []
  } catch (err) {
    toast.error(err.message || 'Could not create the post.')
  } finally {
    posting.value = false
  }
}

function onDeleted(postId) {
  posts.value = posts.value.filter((p) => p.id !== postId)
}
</script>

<style scoped>
.feed-view { display: flex; flex-direction: column; gap: var(--space-m, 16px); max-width: 640px; margin: 0 auto; }
.feed-view__composer { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.feed-view__file { font-size: var(--text-xs, 14px); }
.feed-view__list { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
</style>
