<template>
  <AppLayout>
    <router-view />
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
