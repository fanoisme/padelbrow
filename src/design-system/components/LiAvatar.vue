<template>
  <div :class="['li-avatar', `li-avatar--${size}`]" :style="avatarStyle" :aria-label="alt">
    <img v-if="src" :src="src" :alt="alt" class="li-avatar__img" @error="onError" />
    <span v-else-if="initials" class="li-avatar__initials">{{ initials }}</span>
    <LiIcon v-else name="person" :size="iconSizeMap[size]" />
    <span v-if="badge" :class="['li-avatar__badge', `li-avatar__badge--${badge}`]" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  initials: { type: String, default: '' },
  size: { type: String, default: 'md', validator: v => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v) },
  badge: { type: String, default: '', validator: v => ['', 'online', 'offline', 'busy', 'away'].includes(v) },
})

const imgError = ref(false)

const sizeMap = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 }
const iconSizeMap = { xs: 'sm', sm: 'md', md: 'md', lg: 'lg', xl: 'xl' }
const badgeColorMap = { online: '#10B981', offline: '#999999', busy: '#C83E3B', away: '#FF6B00' }

const avatarStyle = computed(() => ({
  width: `${sizeMap[props.size]}px`,
  height: `${sizeMap[props.size]}px`,
  fontSize: `${sizeMap[props.size] * 0.4}px`,
}))

function onError() { imgError.value = true }
</script>

<style scoped>
.li-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-yellow-300, #FDDD00), var(--color-orange-400, #FF6B00));
  color: var(--color-gray-0, #FFFFFF);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.li-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.li-avatar__initials {
  text-transform: uppercase;
  line-height: 1;
}

.li-avatar__badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  border: 2px solid var(--color-gray-0, #FFFFFF);
}

.li-avatar--xs .li-avatar__badge { width: 6px; height: 6px; border-width: 1px; }
.li-avatar--sm .li-avatar__badge { width: 8px; height: 8px; border-width: 1.5px; }

.li-avatar__badge--online  { background: #10B981; }
.li-avatar__badge--offline { background: #999999; }
.li-avatar__badge--busy    { background: #C83E3B; }
.li-avatar__badge--away    { background: #FF6B00; }
</style>
