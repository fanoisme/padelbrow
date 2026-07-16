<template>
  <div :class="['li-empty-state', `li-empty-state--${size}`]">
    <!-- Illustration / Icon -->
    <div class="li-empty-state__illustration">
      <slot name="illustration">
        <div v-if="illustration" class="li-empty-state__img">
          <img :src="illustration" :alt="title || ''" />
        </div>
        <div v-else class="li-empty-state__icon-circle">
          <LiIcon :name="icon" size="xl" />
        </div>
      </slot>
    </div>

    <!-- Title -->
    <h3 v-if="title || $slots.title" class="li-empty-state__title">
      <slot name="title">{{ title }}</slot>
    </h3>

    <!-- Description -->
    <p v-if="description || $slots.description" class="li-empty-state__desc">
      <slot name="description">{{ description }}</slot>
    </p>

    <!-- Action -->
    <div v-if="$slots.action" class="li-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
import LiIcon from './LiIcon.vue'

defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: String, default: 'inbox' },
  illustration: { type: String, default: '' },
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) },
})
</script>

<style scoped>
.li-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 24px 16px;
}

.li-empty-state--sm  { padding: 16px 12px; }
.li-empty-state--md  { padding: 32px 24px; }
.li-empty-state--lg  { padding: 48px 32px; }

.li-empty-state__illustration {
  margin-bottom: 16px;
}

.li-empty-state--sm .li-empty-state__illustration { margin-bottom: 12px; }
.li-empty-state--lg .li-empty-state__illustration { margin-bottom: 24px; }

.li-empty-state__icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-gray-100, #121212);
  color: var(--color-gray-400, #B3B3B3);
}

.li-empty-state--sm .li-empty-state__icon-circle { width: 48px; height: 48px; }
.li-empty-state--lg .li-empty-state__icon-circle { width: 80px; height: 80px; }

.li-empty-state__img img {
  max-width: 200px;
  max-height: 160px;
  object-fit: contain;
}

.li-empty-state__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: var(--color-gray-900, #FFFFFF);
}

.li-empty-state--sm .li-empty-state__title { font-size: 14px; }
.li-empty-state--lg .li-empty-state__title { font-size: 20px; }

.li-empty-state__desc {
  margin: 0 0 16px;
  max-width: 360px;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--color-gray-500, #999999);
}

.li-empty-state--lg .li-empty-state__desc { max-width: 440px; }

.li-empty-state__action {
  margin-top: 4px;
}
</style>
