import { ref, computed } from 'vue'

/**
 * useTheme — app-wide light/dark theme singleton.
 * Persists to localStorage, respects prefers-color-scheme on first visit,
 * and mirrors the active theme onto <html data-theme> so the [data-theme="dark"]
 * token overrides in tokens.css take effect.
 */
const STORAGE_KEY = 'padelbrow-theme'
let theme = null // module-level singleton, shared across all callers (see useToast pattern)

function systemPrefersDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
}

function apply(value) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = value
  }
}

function init() {
  if (theme) return
  let stored = null
  try { stored = localStorage.getItem(STORAGE_KEY) } catch { /* private mode */ }
  const initial = stored === 'light' || stored === 'dark' ? stored : (systemPrefersDark() ? 'dark' : 'light')
  theme = ref(initial)
  apply(theme.value)
}

export function useTheme() {
  init()
  const isDark = computed(() => theme.value === 'dark')

  function set(value) {
    if (value !== 'light' && value !== 'dark') return
    theme.value = value
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* private mode */ }
    apply(value)
  }

  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, isDark, set, toggle }
}
