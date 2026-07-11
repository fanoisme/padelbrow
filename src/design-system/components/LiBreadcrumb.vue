<template>
  <nav v-if="items.length" class="li-breadcrumb" :aria-label="ariaLabel || 'Breadcrumb'">
    <ol class="li-breadcrumb__list">
      <li v-for="(item, i) in items" :key="i" class="li-breadcrumb__item">
        <LiIcon
          v-if="separator === 'chevron' && i > 0"
          name="chevron_right"
          size="xxs"
          class="li-breadcrumb__sep"
        />
        <span v-else-if="separator === 'slash' && i > 0" class="li-breadcrumb__sep li-breadcrumb__sep--text">/</span>

        <RouterLink
          v-if="item.to && i < items.length - 1"
          :to="item.to"
          class="li-breadcrumb__link"
        >
          <LiIcon v-if="item.icon" :name="item.icon" size="xxs" />
          {{ item.label }}
        </RouterLink>
        <span
          v-else
          class="li-breadcrumb__current"
          :aria-current="i === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import LiIcon from './LiIcon.vue'

defineProps({
  items: {
    type: Array,
    default: () => [],
    /* shape: { label: string, to?: string, icon?: string } */
  },
  separator: { type: String, default: 'chevron', validator: v => ['chevron', 'slash'].includes(v) },
  ariaLabel: { type: String, default: '' },
})

defineEmits(['navigate'])
</script>

<style scoped>
.li-breadcrumb {
  font-family: 'Inter', system-ui, sans-serif;
}

.li-breadcrumb__list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.li-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.li-breadcrumb__sep {
  color: var(--color-gray-300, #CCCCCC);
  flex-shrink: 0;
}

.li-breadcrumb__sep--text {
  font-size: 14px;
  line-height: 1;
}

.li-breadcrumb__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--color-gray-500, #999999);
  text-decoration: none;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-breadcrumb__link:hover {
  color: var(--color-orange-400, #FF6B00);
  background: var(--color-gray-100, #F2F2F2);
}

.li-breadcrumb__link:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

.li-breadcrumb__current {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: var(--color-gray-900, #333333);
  white-space: nowrap;
}
</style>
