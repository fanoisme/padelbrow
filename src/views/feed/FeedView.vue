<template>
  <section class="feed-view">
    <LiPageHeader
      eyebrow="Community"
      :title="clubId ? 'Club feed' : 'Feed'"
      subtitle="See what your padel crew is playing, winning and sharing."
    />

    <LiGlassCard class="feed-view__composer" size="md" :hoverable="false" :textured="false">
      <div class="feed-view__composer-row">
        <div class="feed-view__composer-avatar" aria-hidden="true">{{ composerInitial }}</div>
        <LiTextField
          v-model="caption"
          type="area"
          placeholder="Share something…"
          class="feed-view__composer-field"
        />
      </div>
      <div class="feed-view__composer-foot">
        <label class="feed-view__file-chip">
          <LiIcon name="add_photo_alternate" size="sm" />
          <span>{{ filesLabel }}</span>
          <input type="file" multiple accept="image/*,video/*" class="feed-view__file" @change="onFiles" />
        </label>
        <LiButton :loading="posting" @click="handlePost">Post</LiButton>
      </div>
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
import { ref, computed, onMounted } from 'vue'
import { LiGlassCard, LiButton, LiEmptyState, LiIcon, LiPageHeader, LiRevealOnScroll, LiTextField, useToast } from '../../design-system/components/index.js'
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

// Presentational-only: derived label for the file picker chip, doesn't touch upload logic.
const filesLabel = computed(() => {
  const n = files.value.length
  if (n === 0) return 'Add photos or a video'
  return `${n} file${n > 1 ? 's' : ''} selected`
})

// Presentational-only: avatar initial for the composer row.
const composerInitial = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.email || '?'
  return name.slice(0, 1).toUpperCase()
})

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
.feed-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl, 24px);
  max-width: 640px;
  margin: 0 auto;
}

.feed-view__composer { display: flex; flex-direction: column; gap: var(--space-m, 12px); }

.feed-view__composer-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-m, 12px);
}

.feed-view__composer-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--color-cta-primary-text, #1E1E1E);
  font-weight: 700;
  font-size: var(--text-sm, 15px);
}

.feed-view__composer-field { flex: 1; min-width: 0; }

.feed-view__composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-m, 12px);
  flex-wrap: wrap;
}

.feed-view__file-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  padding: 8px 14px;
  min-height: 44px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  color: var(--color-on-surface-variant, #D4D4D4);
  font-size: var(--text-xs, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--dur-short, 200ms) var(--ease-out), color var(--dur-short, 200ms) var(--ease-out);
}

.feed-view__file-chip:hover { border-color: var(--glass-border-strong, rgba(255, 188, 37, 0.25)); color: var(--color-on-surface, #FFFFFF); }

.feed-view__file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.feed-view__list { display: flex; flex-direction: column; gap: var(--space-xl, 24px); }
</style>
