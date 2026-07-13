<template>
  <LiCard class="post-card">
    <header class="post-card__head">
      <img v-if="post.author.avatar_url" :src="post.author.avatar_url" class="post-card__avatar" alt="" />
      <div class="post-card__avatar post-card__avatar--fallback" v-else>{{ initials }}</div>
      <div class="post-card__meta">
        <strong>{{ post.author.full_name }}</strong>
        <span class="post-card__when">{{ formatWhen(post.created_at) }}</span>
      </div>
    </header>

    <p v-if="post.caption" class="post-card__caption">{{ post.caption }}</p>

    <div v-if="post.media_urls?.length" class="post-card__media">
      <template v-for="(url, i) in post.media_urls" :key="i">
        <video v-if="isVideo(url)" :src="url" controls></video>
        <img v-else :src="url" alt="" />
      </template>
    </div>

    <div class="post-card__actions">
      <button
        type="button"
        data-testid="like-btn"
        class="post-card__action"
        :class="{ 'post-card__action--on': liked }"
        @click="handleLike"
      >
        ♥ {{ likeCount }}
      </button>
      <button v-if="!isOwn" type="button" data-testid="report-btn" class="post-card__action" @click="handleReport">Report</button>
      <button v-if="!isOwn" type="button" data-testid="block-btn" class="post-card__action" @click="handleBlock">Block</button>
      <button v-if="isOwn" type="button" data-testid="delete-btn" class="post-card__action" @click="handleDelete">Delete</button>
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
  </LiCard>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiCard, LiButton, useToast } from '../../design-system/components/index.js'
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
})

async function handleLike() {
  try {
    liked.value = await toggleLike(props.post.id, user.value.id, liked.value)
    likeCount.value += liked.value ? 1 : -1
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
  gap: var(--space-s, 8px);
}
.post-card__head { display: flex; align-items: center; gap: var(--space-s, 8px); }
.post-card__avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.post-card__avatar--fallback {
  display: flex; align-items: center; justify-content: center;
  background: var(--color-gray-200, #E6E6E6); color: var(--color-gray-700, #444);
  font-weight: 600;
}
.post-card__meta { display: flex; flex-direction: column; }
.post-card__when { font-size: var(--text-xs, 12px); color: var(--color-gray-500, #888); }
.post-card__media { display: flex; flex-wrap: wrap; gap: var(--space-s, 8px); }
.post-card__media img { max-width: 100%; border-radius: var(--radius-m, 8px); }
.post-card__actions { display: flex; gap: var(--space-s, 8px); }
.post-card__action {
  background: none; border: none; cursor: pointer; font-size: var(--text-sm, 14px);
  color: var(--color-gray-600, #555);
}
.post-card__action--on { color: var(--color-red-500, #A33129); font-weight: 600; }
.post-card__comments { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.post-card__add { display: flex; gap: var(--space-s, 8px); }
.post-card__comment-input {
  flex: 1; padding: var(--space-xs, 4px) var(--space-s, 8px);
  border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px);
}
</style>
