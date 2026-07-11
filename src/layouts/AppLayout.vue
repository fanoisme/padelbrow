<template>
  <div class="app-shell">
    <header class="app-header">
      <img class="app-header__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
      <span class="app-header__title">PADEL BROW</span>
      <img class="app-header__allo" src="../assets/logo-allo.png" alt="Allo Bank" />
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup></script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: var(--space-m, 16px) var(--space-l, 24px);
  background: var(--surface-glass, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(var(--blur-md, 20px));
  border-bottom: 1px solid var(--border-subtle-color, rgba(0, 0, 0, 0.06));
}

.app-header__mark {
  width: 36px;
  height: 36px;
}

.app-header__title {
  font-weight: 800;
  font-size: var(--text-md, 18px);
  color: var(--color-gray-900, #333333);
  flex: 1;
}

.app-header__allo {
  height: 24px;
  width: auto;
}

.app-main {
  flex: 1;
  padding: var(--space-l, 24px);
}
</style>
