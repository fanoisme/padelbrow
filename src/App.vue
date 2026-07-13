<template>
  <AppLayout>
    <router-view />
  </AppLayout>
  <LiToast />
</template>

<script setup>
import AppLayout from './layouts/AppLayout.vue'
import { LiToast } from './design-system/components/index.js'
</script>
