<template>
  <div class="app-shell">
    <LiScrollProgress />

    <!-- Desktop Sidebar -->
    <aside v-if="user" class="app-sidebar">
      <div class="app-sidebar__header">
        <router-link to="/" class="app-sidebar__brand">
          <img class="app-sidebar__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
          <span class="app-sidebar__title">PADEL BROW</span>
        </router-link>
      </div>

      <nav class="app-sidebar__nav">
        <router-link
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate, isActive, isExactActive }"
        >
          <a
            :href="href"
            class="sidebar-item"
            :class="{ 'router-link-active': item.to === '/' ? isExactActive : isActive }"
            @click="navigate"
          >
            <LiIcon :name="item.icon" size="sm" />
            <span class="sidebar-item__label">{{ item.label }}</span>
          </a>
        </router-link>
      </nav>

      <div class="app-sidebar__divider" />

      <nav class="app-sidebar__nav app-sidebar__nav--secondary">
        <router-link
          v-for="item in secondaryNav"
          :key="item.to"
          :to="item.to"
          class="sidebar-item sidebar-item--secondary"
        >
          <LiIcon :name="item.icon" size="sm" />
          <span class="sidebar-item__label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="app-sidebar__footer">
        <router-link to="/profile" class="sidebar-item sidebar-item--user">
          <LiIcon name="person" size="sm" />
          <span class="sidebar-item__label">Profile</span>
        </router-link>
        <button type="button" class="sidebar-item sidebar-item--signout" @click="handleSignOut">
          <LiIcon name="logout" size="sm" />
          <span class="sidebar-item__label">Sign out</span>
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="app-content">
      <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
        <router-link to="/" class="app-header__brand">
          <img class="app-header__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
          <span class="app-header__title">PADEL BROW</span>
        </router-link>

        <!-- Logged out nav (mobile + desktop) -->
        <nav v-if="!user" class="app-header__nav app-header__nav--pills">
          <a href="#features" class="nav-pill">Features</a>
          <a href="#how" class="nav-pill">How it works</a>
          <router-link to="/login" class="nav-pill nav-pill--ghost">Sign in</router-link>
          <router-link to="/signup" class="nav-pill nav-pill--primary">Get started</router-link>
        </nav>

        <div class="app-header__spacer" />

        <NotificationsBell v-if="user" class="app-header__bell" />
        <img class="app-header__allo" src="../assets/logo-allo.png" alt="Allo Bank" />
      </header>

      <main class="app-main">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom tab bar -->
    <nav v-if="user" class="bottom-tab-bar" aria-label="Primary">
      <router-link to="/" custom v-slot="{ href, navigate, isExactActive }">
        <a :href="href" class="bottom-tab-bar__item" :class="{ 'router-link-active': isExactActive }" @click="navigate">
          <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="home" size="md" /></span>
          <span class="bottom-tab-bar__label">Home</span>
        </a>
      </router-link>
      <router-link to="/meets" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="sports_tennis" size="md" /></span>
        <span class="bottom-tab-bar__label">Meets</span>
      </router-link>
      <router-link to="/clubs" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="groups" size="md" /></span>
        <span class="bottom-tab-bar__label">Clubs</span>
      </router-link>
      <router-link to="/leaderboard" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="leaderboard" size="md" /></span>
        <span class="bottom-tab-bar__label">Leaderboard</span>
      </router-link>
      <button type="button" class="bottom-tab-bar__item" data-testid="bottom-nav-more" @click="showMore = true">
        <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="more_horiz" size="md" /></span>
        <span class="bottom-tab-bar__label">More</span>
      </button>
    </nav>

    <LiBottomSheet v-model="showMore" title="More">
      <div class="more-sheet__list">
        <router-link
          v-for="item in sheetNav"
          :key="item.to"
          :to="item.to"
          class="more-sheet__item"
          @click="showMore = false"
        >
          <LiIcon :name="item.icon" size="sm" />{{ item.label }}
        </router-link>
      </div>
      <template #footer>
        <LiButton variant="secondary" @click="handleSignOutFromSheet">Sign out</LiButton>
      </template>
    </LiBottomSheet>

    <LiCommandPalette v-model="paletteOpen" :commands="commands" @execute="onCommand" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import NotificationsBell from '../components/notifications/NotificationsBell.vue'
import { LiBottomSheet, LiButton, LiIcon, LiScrollProgress, LiCommandPalette } from '../design-system/components/index.js'
import { useRouter } from 'vue-router'

const { user, signOut } = useAuth()
const showMore = ref(false)

const primaryNav = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/meets', label: 'Meets', icon: 'sports_tennis' },
  { to: '/clubs', label: 'Clubs', icon: 'groups' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
]

const secondaryNav = [
  { to: '/feed', label: 'Feed', icon: 'newspaper' },
  { to: '/competitions', label: 'Competitions', icon: 'emoji_events' },
  { to: '/network', label: 'Network', icon: 'diversity_3' },
  { to: '/achievements', label: 'Achievements', icon: 'military_tech' },
  { to: '/challenges', label: 'Challenges', icon: 'flag' },
  { to: '/stats', label: 'Stats', icon: 'insights' },
]

const sheetNav = [
  ...secondaryNav,
  { to: '/profile', label: 'Profile', icon: 'person' },
]

const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 8 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const router = useRouter()
const paletteOpen = ref(false)
const commands = [
  {
    label: 'Navigate',
    items: [
      ...primaryNav.map(n => ({ id: `go:${n.to}`, label: n.label })),
      ...secondaryNav.map(n => ({ id: `go:${n.to}`, label: n.label })),
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'signout', label: 'Sign out' },
    ],
  },
]
function onCommand(cmd) {
  if (cmd.id.startsWith('go:')) router.push(cmd.id.slice(3))
  else if (cmd.id === 'signout') handleSignOut()
}

async function handleSignOut() {
  await signOut()
}

async function handleSignOutFromSheet() {
  showMore.value = false
  await signOut()
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
}

/* ── Desktop Sidebar ── */
.app-sidebar {
  display: none;
  width: 240px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: var(--z-sticky, 30);
  background: #0A0A0A;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

@media (min-width: 769px) {
  .app-sidebar {
    display: flex;
  }
}

.app-sidebar__header {
  padding: var(--space-l, 24px) var(--space-l, 24px) var(--space-m, 16px);
  flex-shrink: 0;
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  text-decoration: none;
}

.app-sidebar__mark {
  width: 32px;
  height: 32px;
  animation: lith-float 8s var(--ease-in-out-sine, ease-in-out) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .app-sidebar__mark { animation: none; }
}

.app-sidebar__title {
  font-weight: 800;
  font-size: var(--text-md, 16px);
  color: var(--color-gray-900, #FFFFFF);
  letter-spacing: -0.01em;
}

.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--space-s, 8px);
}

.app-sidebar__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: var(--space-m, 12px) var(--space-l, 24px);
}

.app-sidebar__nav--secondary {
  flex: 1;
}

.app-sidebar__footer {
  padding: var(--space-s, 8px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-m, 12px);
  padding: 10px var(--space-m, 12px);
  border-radius: var(--radius-md, 12px);
  text-decoration: none;
  color: var(--color-on-surface-variant, #D4D4D4);
  font-size: var(--text-sm, 14px);
  font-weight: 500;
  transition: background var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)),
              color var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16,1,0.3,1));
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  text-align: left;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-gray-900, #FFFFFF);
}

.sidebar-item.router-link-active {
  background: rgba(255, 175, 3, 0.12);
  color: var(--color-brand, #FFAF03);
}

.sidebar-item--secondary {
  font-size: var(--text-xs, 13px);
  padding: 8px var(--space-m, 12px);
}

.sidebar-item--user {
  margin-bottom: 2px;
}

.sidebar-item--signout {
  color: var(--color-error, #C83E3B);
}
.sidebar-item--signout:hover {
  background: rgba(200, 62, 59, 0.12);
  color: var(--color-error, #C83E3B);
}

/* ── Main content area ── */
.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

@media (min-width: 769px) {
  .app-content {
    margin-left: 240px;
  }
}

.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky, 30);
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: calc(var(--space-m, 16px) + env(safe-area-inset-top, 0px)) var(--space-l, 24px) var(--space-m, 16px);
  background: #0A0A0A;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  isolation: isolate;
}
.app-header--scrolled {
  background: #0A0A0A;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  border-bottom-color: rgba(255,188,37,0.2);
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
  animation: lith-float 8s var(--ease-in-out-sine, ease-in-out) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .app-header__mark { animation: none; }
}

.app-header__title {
  font-weight: 800;
  font-size: var(--text-md, 18px);
  color: var(--color-gray-900, #FFFFFF);
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

.app-header__spacer {
  flex: 1;
}

.nav-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  padding: 8px 16px;
  border-radius: var(--radius-pill, 999px);
  font-size: var(--text-xs, 14px);
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
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
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-on-surface, #FFFFFF);
}

.nav-pill.router-link-active {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: #0A0A0A;
  box-shadow: var(--shadow-glow-subtle, 0 0 16px rgba(255,188,37,0.12));
}

.nav-pill--primary {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--cta-primary-text, #0A0A0A);
  box-shadow: 0 4px 16px rgba(255, 188, 37, 0.25);
}
.nav-pill--primary:hover {
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: var(--cta-primary-text, #0A0A0A);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(255, 188, 37, 0.35);
}

.nav-pill--ghost {
  color: var(--color-gray-900, #FFFFFF);
}

.app-header__bell {
  flex-shrink: 0;
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

/* ── Mobile bottom tab bar ── */
.bottom-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .app-header__title { display: none; }
  .app-main {
    padding: var(--space-m, 16px);
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }

  .bottom-tab-bar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-sticky, 30);
    justify-content: space-around;
    background: #0A0A0A;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
  }
}

.bottom-tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant, #D4D4D4);
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  border-radius: var(--radius-sm, 12px);
}

.bottom-tab-bar__item.router-link-active {
  color: var(--color-brand, #FFAF03);
}

.bottom-tab-bar__icon {
  font-size: 20px;
  line-height: 1;
}

.bottom-tab-bar__label {
  font-size: 10px;
  font-weight: 600;
}

.more-sheet__list {
  display: flex;
  flex-direction: column;
}

.more-sheet__item {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
  min-height: 44px;
  padding: var(--space-m, 12px) var(--space-s, 8px);
  text-decoration: none;
  color: var(--color-gray-900, #FFFFFF);
  font-weight: 600;
  border-radius: var(--radius-sm, 8px);
}

.more-sheet__item:hover {
  background: var(--color-gray-100, #121212);
}
</style>
