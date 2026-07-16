<template>
  <LiGlassCard class="post-card" size="md" :textured="false">
    <header class="post-card__head">
      <img v-if="post.author.avatar_url" :src="post.author.avatar_url" class="post-card__avatar" alt="" />
      <div class="post-card__avatar post-card__avatar--fallback" v-else>{{ initials }}</div>
      <div class="post-card__meta">
        <strong class="post-card__name">{{ post.author.full_name }}</strong>
        <span class="post-card__when">{{ formatWhen(post.created_at) }}</span>
      </div>
    </header>

    <p v-if="post.caption" class="post-card__caption">{{ post.caption }}</p>

    <div v-if="post.media_urls?.length" class="post-card__media" :class="{ 'post-card__media--single': post.media_urls.length === 1 }">
      <template v-for="(url, i) in post.media_urls" :key="i">
        <video v-if="isVideo(url)" :src="url" controls class="post-card__media-item"></video>
        <button v-else type="button" class="post-card__media-item post-card__media-btn" @click="openLightbox(url)">
          <img :src="url" alt="" />
          <span class="post-card__media-expand" aria-hidden="true">
            <LiIcon name="fullscreen" size="sm" />
          </span>
        </button>
      </template>
    </div>

    <div class="post-card__actions">
      <LiSparkle :trigger="justLiked" :count="10" :lifespan="700" class="post-card__like-sparkle">
        <button
          type="button"
          data-testid="like-btn"
          class="post-card__action post-card__action--like"
          :class="{ 'post-card__action--on': liked, 'post-card__action--pop': justLiked }"
          @click="handleLike"
        >
          <LiIcon name="favorite" size="sm" :filled="liked" />
          <span>{{ likeCount }}</span>
        </button>
      </LiSparkle>
      <button v-if="!isOwn" type="button" data-testid="report-btn" class="post-card__action" @click="handleReport">
        <LiIcon name="flag" size="sm" /> Report
      </button>
      <button v-if="!isOwn" type="button" data-testid="block-btn" class="post-card__action" @click="handleBlock">
        <LiIcon name="block" size="sm" /> Block
      </button>
      <button v-if="isOwn" type="button" data-testid="delete-btn" class="post-card__action post-card__action--danger" @click="handleDelete">
        <LiIcon name="delete" size="sm" /> Delete
      </button>
    </div>

    <ul v-if="comments.length" class="post-card__comments">
      <li v-for="c in comments" :key="c.id">
        <strong>{{ c.author?.full_name }}:</strong> {{ c.body }}
      </li>
    </ul>

    <div class="post-card__add">
      <input v-model="newComment" type="text" placeholder="Add a comment" class="post-card__comment-input" @keydown.enter="handleAddComment" />
      <LiButton size="sm" @click="handleAddComment">Post</LiButton>
    </div>
  </LiGlassCard>

  <div v-if="lightboxUrl" class="post-card-lightbox" @click="closeLightbox">
    <img :src="lightboxUrl" alt="" class="post-card-lightbox__img" @click.stop />
    <button type="button" class="post-card-lightbox__close" aria-label="Close image" @click="closeLightbox">
      <LiIcon name="close" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LiGlassCard, LiButton, LiIcon, LiSparkle, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useFeed } from '../../composables/useFeed.js'
import { useFeedInteractions } from '../../composables/useFeedInteractions.js'
import { useModeration } from '../../composables/useModeration.js'

const props = defineProps({ post: { type: Object, required: true } })
const emit = defineEmits(['deleted'])
const toast = useToast()
const { user } = useAuth()
const { deletePost } = useFeed()
const { listComments, addComment, listLikes, isLiked, toggleLike } = useFeedInteractions()
const { report, blockUser } = useModeration()

const comments = ref([])
const likeCount = ref(0)
const liked = ref(false)
const newComment = ref('')

// Presentational-only: drives the like-spring + sparkle burst, reset shortly after firing.
const justLiked = ref(false)
let likePopTimer = null

// Presentational-only: media lightbox state (click-to-expand image overlay).
const lightboxUrl = ref('')

const isOwn = computed(() => props.post.author?.id === user.value?.id)
const initials = computed(() => (props.post.author?.full_name || '?').slice(0, 1).toUpperCase())

onMounted(async () => {
  try {
    const [count, likedState, cs] = await Promise.all([
      listLikes(props.post.id),
      isLiked(props.post.id, user.value.id),
      listComments(props.post.id),
    ])
    likeCount.value = count
    liked.value = likedState
    comments.value = cs
  } catch (err) {
    toast.error(err.message || 'Could not load this post.')
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (likePopTimer) clearTimeout(likePopTimer)
})

function onKeydown(e) {
  if (e.key === 'Escape') closeLightbox()
}

function openLightbox(url) {
  lightboxUrl.value = url
}

function closeLightbox() {
  lightboxUrl.value = ''
}

async function handleLike() {
  try {
    liked.value = await toggleLike(props.post.id, user.value.id, liked.value)
    likeCount.value += liked.value ? 1 : -1
    if (liked.value) {
      justLiked.value = true
      if (likePopTimer) clearTimeout(likePopTimer)
      likePopTimer = setTimeout(() => { justLiked.value = false }, 600)
    } else {
      justLiked.value = false
    }
  } catch (err) {
    toast.error(err.message || 'Could not update like.')
  }
}

async function handleAddComment() {
  const body = newComment.value.trim()
  if (!body) return
  try {
    const added = await addComment(props.post.id, body, user.value.id)
    comments.value.push(added)
    newComment.value = ''
  } catch (err) {
    toast.error(err.message || 'Could not add the comment.')
  }
}

async function handleDelete() {
  try {
    await deletePost(props.post.id)
    emit('deleted', props.post.id)
  } catch (err) {
    toast.error(err.message || 'Could not delete the post.')
  }
}

async function handleReport() {
  try {
    await report('feed_post', props.post.id, 'Reported via feed', user.value.id)
    toast.success('Reported. Thanks.')
  } catch (err) {
    toast.error(err.message || 'Could not report.')
  }
}

async function handleBlock() {
  try {
    await blockUser(user.value.id, props.post.author.id)
    toast.success('User blocked.')
  } catch (err) {
    toast.error(err.message || 'Could not block the user.')
  }
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

// media_urls are Supabase Storage public URLs preserving the original extension,
// so an extension check is enough to pick <video> vs <img>.
function isVideo(url) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url)
}
</script>

<style scoped>
.post-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}

.post-card__head { display: flex; align-items: center; gap: var(--space-m, 12px); }

.post-card__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.post-card__avatar--fallback {
  display: flex; align-items: center; justify-content: center;
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--color-cta-primary-text, #1E1E1E);
  font-weight: 700;
}

.post-card__meta { display: flex; flex-direction: column; min-width: 0; }
.post-card__name { color: var(--color-on-surface, #FFFFFF); }
.post-card__when { font-size: var(--text-xs, 12px); color: var(--color-on-surface-muted, #B0B0B0); }

.post-card__caption { margin: 0; color: var(--color-on-surface, #FFFFFF); line-height: 1.5; }

/* ── Media grid + lightbox trigger ── */
.post-card__media {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-s, 8px);
  border-radius: var(--radius-md, 16px);
  overflow: hidden;
}
.post-card__media--single { grid-template-columns: 1fr; }

.post-card__media-item {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: var(--radius-sm, 12px);
  display: block;
  background: var(--color-surface-bright, #141414);
}

.post-card__media-btn {
  position: relative;
  padding: 0;
  border: none;
  cursor: zoom-in;
  overflow: hidden;
  border-radius: var(--radius-sm, 12px);
}
.post-card__media-btn img {
  width: 100%;
  height: 100%;
  max-height: 420px;
  object-fit: cover;
  display: block;
  transition: transform var(--dur-medium, 300ms) var(--ease-smooth);
}
.post-card__media-btn:hover img { transform: scale(1.04); }

.post-card__media-expand {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: var(--color-on-surface, #FFFFFF);
  opacity: 0;
  transition: opacity var(--dur-short, 200ms) var(--ease-out);
}
.post-card__media-btn:hover .post-card__media-expand,
.post-card__media-btn:focus-visible .post-card__media-expand { opacity: 1; }

/* ── Actions ── */
.post-card__actions { display: flex; gap: var(--space-s, 8px); flex-wrap: wrap; }

.post-card__like-sparkle { position: relative; display: inline-flex; }

.post-card__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-pill, 999px);
  padding: 8px 14px;
  min-height: 44px;
  cursor: pointer;
  font-size: var(--text-xs, 13px);
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
  transition: border-color var(--dur-short, 200ms) var(--ease-out),
              color var(--dur-short, 200ms) var(--ease-out),
              transform var(--dur-short, 200ms) var(--ease-spring);
}
.post-card__action:hover { border-color: var(--glass-border-hover, rgba(255, 255, 255, 0.15)); color: var(--color-on-surface, #FFFFFF); }
.post-card__action:active { transform: scale(0.95); }

.post-card__action--on { color: var(--color-red-300, #D4735F); border-color: var(--glass-border-strong, rgba(255, 188, 37, 0.25)); }
.post-card__action--danger:hover { color: var(--color-red-300, #D4735F); }

/* Like spring pop — a quick scale-up/settle when a like fires. */
.post-card__action--pop { animation: post-card-like-pop 500ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)); }
@keyframes post-card-like-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.28); }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.post-card__comments { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs, 6px); font-size: var(--text-sm, 14px); color: var(--color-on-surface-variant, #D4D4D4); }

.post-card__add { display: flex; gap: var(--space-s, 8px); }
.post-card__comment-input {
  flex: 1;
  min-height: 44px;
  padding: var(--space-xs, 4px) var(--space-m, 12px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.04));
  color: var(--color-on-surface, #FFFFFF);
}
.post-card__comment-input:focus { outline: none; border-color: var(--glass-border-strong, rgba(255, 188, 37, 0.25)); }

/* ── Lightbox overlay ── */
.post-card-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: var(--glass-blur-light, blur(12px));
  -webkit-backdrop-filter: var(--glass-blur-light, blur(12px));
  padding: var(--space-xl, 24px);
  animation: post-card-lightbox-in var(--dur-medium, 300ms) var(--ease-out, ease) both;
}
@keyframes post-card-lightbox-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.post-card-lightbox__img {
  max-width: min(90vw, 900px);
  max-height: 85vh;
  border-radius: var(--radius-md, 16px);
  box-shadow: var(--shadow-glow-subtle, 0 0 16px rgba(255, 188, 37, 0.12));
  object-fit: contain;
}
.post-card-lightbox__close {
  position: absolute;
  top: var(--space-xl, 24px);
  right: var(--space-xl, 24px);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-on-surface, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--dur-short, 200ms) var(--ease-out);
}
.post-card-lightbox__close:hover { background: rgba(255, 255, 255, 0.16); }

@media (max-width: 480px) {
  .post-card__media { grid-template-columns: 1fr; }
  .post-card__media-item, .post-card__media-btn img { max-height: 320px; }
}

@media (prefers-reduced-motion: reduce) {
  .post-card__action { transition: none; }
  .post-card__action:active { transform: none; }
  .post-card__action--pop { animation: none; }
  .post-card__media-btn img { transition: none; }
  .post-card__media-btn:hover img { transform: none; }
  .post-card-lightbox { animation: none; }
}
</style>
