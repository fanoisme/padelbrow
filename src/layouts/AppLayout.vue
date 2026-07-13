<template>
  <div class="app-shell">
    <header class="app-header">
      <router-link to="/" class="app-header__brand">
        <img class="app-header__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
        <span class="app-header__title">PADEL BROW</span>
      </router-link>

      <nav v-if="user" class="app-header__nav app-header__nav--pills">
        <router-link to="/feed" class="nav-pill">Feed</router-link>
        <router-link to="/competitions" class="nav-pill">Competitions</router-link>
        <router-link to="/meets" class="nav-pill">Meets</router-link>
        <router-link to="/clubs" class="nav-pill">Clubs</router-link>
        <router-link to="/network" class="nav-pill">Network</router-link>
        <router-link to="/leaderboard" class="nav-pill">Leaderboard</router-link>
        <router-link to="/achievements" class="nav-pill">Achievements</router-link>
        <router-link to="/profile" class="nav-pill">Profile</router-link>
        <NotificationsBell />
        <button class="nav-pill nav-pill--ghost" @click="handleSignOut">Sign out</button>
      </nav>
      <nav v-else class="app-header__nav app-header__nav--pills">
        <a href="#features" class="nav-pill">Features</a>
        <a href="#how" class="nav-pill">How it works</a>
        <router-link to="/login" class="nav-pill nav-pill--ghost">Sign in</router-link>
        <router-link to="/signup" class="nav-pill nav-pill--primary">Get started</router-link>
      </nav>
      <img class="app-header__allo" src="../assets/logo-allo.png" alt="Allo Bank" />
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuth } from '../composables/useAuth.js'
import NotificationsBell from '../components/notifications/NotificationsBell.vue'

const { user, signOut } = useAuth()

async function handleSignOut() {
  await signOut()
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky, 30);
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: var(--space-m, 16px) var(--space-l, 24px);
  background: var(--glass-bg-light, rgba(255, 255, 255, 0.5));
  backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
  -webkit-backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
  border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  text-decoration: none;
  flex-shrink: 0;
}

.app-header__mark {
  width: 36px;
  height: 36px;
}

.app-header__title {
  font-weight: 800;
  font-size: var(--text-md, 18px);
  color: var(--color-gray-900, #333333);
  letter-spacing: -0.01em;
}

.app-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  margin-left: auto;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px;
}
.app-header__nav::-webkit-scrollbar { display: none; }

.nav-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--radius-pill, 999px);
  font-size: var(--text-xs, 14px);
  font-weight: 600;
  color: var(--color-on-surface-variant, #666666);
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)),
              color var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)),
              box-shadow var(--dur-short, 200ms) var(--ease-out, ease);
  border: none;
  cursor: pointer;
  font-family: inherit;
  background: transparent;
}

.nav-pill:hover {
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.35));
  color: var(--color-on-surface, #333333);
}

.nav-pill.router-link-active {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: #1E1E1E;
  box-shadow: var(--shadow-glow-subtle, 0 0 16px rgba(255,188,37,0.12));
}

.nav-pill--primary {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--cta-primary-text, #1E1E1E);
  box-shadow: 0 4px 16px rgba(255, 188, 37, 0.25);
}
.nav-pill--primary:hover {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--cta-primary-text, #1E1E1E);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(255, 188, 37, 0.35);
}

.nav-pill--ghost {
  color: var(--color-on-surface, #333333);
}

.app-header__allo {
  height: 24px;
  width: auto;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  padding: var(--space-l, 24px);
}

@media (max-width: 720px) {
  .app-header__title { display: none; }
  .app-main { padding: var(--space-m, 16px); }
}
</style>
