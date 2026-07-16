<template>
  <nav v-if="totalPages > 1" class="li-pagination" role="navigation" :aria-label="ariaLabel || 'Pagination'">
    <!-- Previous -->
    <button
      class="li-pagination__btn li-pagination__nav"
      :disabled="currentPage <= 1"
      :aria-label="prevLabel || 'Previous page'"
      @click="goTo(currentPage - 1)"
    >
      <LiIcon name="chevron_left" size="sm" />
      <span v-if="showLabels" class="li-pagination__nav-label">{{ prevLabel || 'Prev' }}</span>
    </button>

    <!-- Pages -->
    <div class="li-pagination__pages">
      <template v-for="page in displayedPages" :key="page">
        <span v-if="page === 'ellipsis'" class="li-pagination__ellipsis">…</span>
        <button
          v-else
          :class="['li-pagination__btn', { 'li-pagination__btn--active': page === currentPage }]"
          :aria-current="page === currentPage ? 'page' : undefined"
          :aria-label="`Page ${page}`"
          @click="goTo(page)"
        >
          {{ page }}
        </button>
      </template>
    </div>

    <!-- Next -->
    <button
      class="li-pagination__btn li-pagination__nav"
      :disabled="currentPage >= totalPages"
      :aria-label="nextLabel || 'Next page'"
      @click="goTo(currentPage + 1)"
    >
      <span v-if="showLabels" class="li-pagination__nav-label">{{ nextLabel || 'Next' }}</span>
      <LiIcon name="chevron_right" size="sm" />
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  totalPages: { type: Number, required: true },
  siblingCount: { type: Number, default: 1 },
  showLabels: { type: Boolean, default: false },
  prevLabel: { type: String, default: '' },
  nextLabel: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const currentPage = computed(() => props.modelValue)

const displayedPages = computed(() => {
  const total = props.totalPages
  const current = currentPage.value
  const siblings = props.siblingCount

  // Total pages 7 or less — show all
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = []

  // Always show first page
  pages.push(1)

  // Left sibling range
  const leftStart = Math.max(2, current - siblings)
  const leftEnd = Math.min(current + siblings, total - 1)

  // Ellipsis after first page?
  if (leftStart > 2) {
    pages.push('ellipsis')
  }

  // Middle range
  for (let i = leftStart; i <= leftEnd; i++) {
    pages.push(i)
  }

  // Ellipsis before last page?
  if (leftEnd < total - 1) {
    pages.push('ellipsis')
  }

  // Always show last page
  pages.push(total)

  return pages
})

function goTo(page) {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:modelValue', page)
  }
}
</script>

<style scoped>
.li-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: 'Inter', system-ui, sans-serif;
  user-select: none;
}

.li-pagination__pages {
  display: flex;
  align-items: center;
  gap: 2px;
}

.li-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-gray-700, #B3B3B3);
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-pagination__btn:hover:not(:disabled):not(.li-pagination__btn--active) {
  background: var(--color-gray-100, #121212);
  color: var(--color-gray-900, #FFFFFF);
}

.li-pagination__btn--active {
  background: var(--color-yellow-100, #FFF3D6);
  color: var(--color-yellow-500, #F4A600);
  font-weight: 600;
}

.li-pagination__btn:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

.li-pagination__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.li-pagination__nav {
  padding: 0 8px;
  gap: 4px;
}

.li-pagination__nav-label {
  font-size: 13px;
  font-weight: 500;
}

.li-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--color-gray-400, #B3B3B3);
  letter-spacing: 0.1em;
}
</style>
