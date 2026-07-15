<template>
  <!--
    LiThemeToggle · light/dark switch
    Icon swaps sun/moon via LiIcon (Material Symbols). Spring rotate on switch.
  -->
  <button
    type="button"
    class="li-theme-toggle"
    :class="{ 'li-theme-toggle--dark': isDark }"
    :aria-pressed="isDark"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    title="Toggle theme"
    @click="toggle"
  >
    <LiIcon :name="isDark ? 'light_mode' : 'dark_mode'" size="md" />
  </button>
</template>

<script setup>
import LiIcon from './LiIcon.vue'
import { useTheme } from '../composables/useTheme.js'

const { isDark, toggle } = useTheme()
</script>

<style scoped>
.li-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.35));
  color: var(--color-on-surface, #333333);
  cursor: pointer;
  transition: transform var(--dur-short, 200ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
              background var(--dur-short, 200ms) var(--ease-out, cubic-bezier(0.4, 0, 0.2, 1));
}
.li-theme-toggle:hover { background: var(--glass-bg-light, rgba(255, 255, 255, 0.5)); }
.li-theme-toggle:active { transform: scale(0.94); }
.li-theme-toggle:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}
.li-theme-toggle :deep(.li-icon) {
  transition: transform var(--dur-medium, 300ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}
.li-theme-toggle--dark :deep(.li-icon) { transform: rotate(360deg); }

@media (prefers-reduced-motion: reduce) {
  .li-theme-toggle,
  .li-theme-toggle :deep(.li-icon) { transition: none; transform: none; }
  .li-theme-toggle:active { transform: none; }
}
</style>
