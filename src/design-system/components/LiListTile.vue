<template>
  <div 
    class="li-list-tile" 
    :class="{ 'li-list-tile-interactive': interactive || !!$attrs.onClick }"
    @click="$emit('click', $event)"
    ref="tileRef"
  >
    <div v-if="$slots.leading || avatar || icon" class="li-list-tile-leading">
      <slot name="leading">
        <div v-if="avatar" class="li-list-tile-avatar">
          <img :src="avatar" alt="Avatar" />
        </div>
        <div v-else-if="icon" class="li-list-tile-icon">
          <component :is="icon" />
        </div>
      </slot>
    </div>

    <div class="li-list-tile-content">
      <div class="li-list-tile-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="$slots.subtitle || subtitle" class="li-list-tile-subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>

    <div v-if="$slots.trailing || badge || actionIcon" class="li-list-tile-trailing">
      <slot name="trailing">
        <span v-if="badge" class="li-list-tile-badge">{{ badge }}</span>
        <div v-else-if="actionIcon" class="li-list-tile-action-icon">
          <component :is="actionIcon" />
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRipple } from '../composables/useRipple';

const props = defineProps({
  title: String,
  subtitle: String,
  avatar: String,
  icon: [Object, String],
  actionIcon: [Object, String],
  badge: [String, Number],
  interactive: Boolean
});

defineEmits(['click']);

const tileRef = ref(null);
const { addRipple } = useRipple();

onMounted(() => {
  if (tileRef.value && (props.interactive || tileRef.value.hasAttribute('onClick'))) {
    tileRef.value.addEventListener('mousedown', (e) => addRipple(e, tileRef.value));
  }
});
</script>

<style scoped>
.li-list-tile {
  display: flex;
  align-items: center;
  padding: var(--space-l, 16px);
  gap: var(--space-m, 12px);
  background-color: var(--color-gray-0, #FFFFFF);
  font-family: var(--font-family, 'Inter', sans-serif);
  position: relative;
  overflow: hidden;
}

.li-list-tile-interactive {
  cursor: pointer;
  transition: background-color var(--dur-short, 200ms) var(--ease-out);
}

.li-list-tile-interactive:hover {
  background-color: var(--color-gray-100, #F2F2F2);
}

.li-list-tile-leading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.li-list-tile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--color-gray-200, #E6E6E6);
}

.li-list-tile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.li-list-tile-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-gray-100, #F2F2F2);
  color: var(--color-gray-600, #808080);
  display: flex;
  align-items: center;
  justify-content: center;
}

.li-list-tile-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.li-list-tile-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.li-list-tile-title {
  font-size: var(--text-sm, 16px);
  font-weight: 600;
  color: var(--color-gray-900, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.li-list-tile-subtitle {
  font-size: var(--text-xs, 14px);
  color: var(--color-gray-600, #808080);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.li-list-tile-trailing {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
  flex-shrink: 0;
}

.li-list-tile-action-icon {
  color: var(--color-gray-400, #B3B3B3);
  display: flex;
  align-items: center;
}

.li-list-tile-action-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.li-list-tile-badge {
  background-color: var(--color-orange-400, #FF6B00);
  color: white;
  font-size: var(--text-tiny, 10px);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-pill, 999px);
  min-width: 18px;
  text-align: center;
}
</style>
