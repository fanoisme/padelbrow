import { ref, computed } from 'vue'

/**
 * useTheme — dark-only app. Light mode removed.
 * Keeps the same API surface so existing callers don't break.
 */

const theme = ref('dark')
const isDark = computed(() => true)

export function useTheme() {
  return { theme, isDark, set: () => {}, toggle: () => {} }
}
