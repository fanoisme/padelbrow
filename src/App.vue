<template>
  <AppLayout>
    <router-view v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'li-page'">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
  </AppLayout>
  <LiToast />
</template>

<script setup>
import AppLayout from './layouts/AppLayout.vue'
import { LiToast, useTheme } from './design-system/components/index.js'

// Initialise the theme singleton — sets <html data-theme> from storage /
// prefers-color-scheme before the first authed view paints.
useTheme()
</script>

<style>
/* Page transition — crossfade + slide.
   Leaving component is absolutely positioned so it doesn't block layout,
   and z-indexed above the entering component so it fades out on top. */
.li-page-leave-active {
  position: absolute;
  inset: 0;
  z-index: 1;
  transition: opacity var(--dur-medium, 300ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1)),
              transform var(--dur-medium, 300ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
}
.li-page-enter-active {
  transition: opacity var(--dur-medium, 300ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1)),
              transform var(--dur-medium, 300ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
}
.li-page-enter-from { opacity: 0; transform: translateX(24px); }
.li-page-leave-to   { opacity: 0; transform: translateX(-24px); }

@media (prefers-reduced-motion: reduce) {
  .li-page-enter-from, .li-page-leave-to { transform: none; }
  .li-page-enter-active, .li-page-leave-active { transition: opacity var(--dur-short, 200ms) ease; }
}
</style>
