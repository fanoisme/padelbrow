<template>
  <div class="app-shell">
    <LiScrollProgress />
    <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
      <router-link to="/" class="app-header__brand">
        <img class="app-header__mark" src="../assets/padel-brow-mark.svg" alt="PADEL BROW" />
        <span class="app-header__title">PADEL BROW</span>
      </router-link>

      <nav v-if="user" class="app-header__nav app-header__nav--pills">
        <router-link v-for="item in primaryNav" :key="item.to" :to="item.to" class="nav-pill">
          <LiIcon :name="item.icon" size="sm" />
          <span class="nav-pill__label">{{ item.label }}</span>
        </router-link>
        <LiDropdown ref="moreDropdown" align="right">
          <template #trigger>
            <button type="button" class="nav-pill">
              <LiIcon name="more_horiz" size="sm" />
              <span class="nav-pill__label">More</span>
            </button>
          </template>
          <router-link
            v-for="item in moreNav"
            :key="item.to"
            :to="item.to"
            class="more-item"
            @click="closeMore"
          >
            <LiIcon :name="item.icon" size="sm" />{{ item.label }}
          </router-link>
          <button type="button" class="more-item" @click="signOutFromMore">
            <LiIcon name="logout" size="sm" />Sign out
          </button>
        </LiDropdown>
      </nav>
      <nav v-else class="app-header__nav app-header__nav--pills">
        <a href="#features" class="nav-pill">Features</a>
        <a href="#how" class="nav-pill">How it works</a>
        <router-link to="/login" class="nav-pill nav-pill--ghost">Sign in</router-link>
        <router-link to="/signup" class="nav-pill nav-pill--primary">Get started</router-link>
      </nav>
      <NotificationsBell v-if="user" class="app-header__bell" />
      <LiThemeToggle class="app-header__theme" />
      <img class="app-header__allo" src="../assets/logo-allo.png" alt="Allo Bank" />
    </header>

    <main class="app-main">
      <slot />
    </main>

    <nav v-if="user" class="bottom-tab-bar" aria-label="Primary">
      <router-link to="/feed" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="newspaper" size="md" /></span>
        <span class="bottom-tab-bar__label">Feed</span>
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
        <router-link to="/competitions" class="more-sheet__item" @click="showMore = false">🏆 Competitions</router-link>
        <router-link to="/network" class="more-sheet__item" @click="showMore = false">🧑‍🤝‍🧑 Network</router-link>
        <router-link to="/achievements" class="more-sheet__item" @click="showMore = false">🏅 Achievements</router-link>
        <router-link to="/challenges" class="more-sheet__item" @click="showMore = false">🎯 Challenges</router-link>
        <router-link to="/stats" class="more-sheet__item" @click="showMore = false">📈 My stats</router-link>
        <router-link to="/profile" class="more-sheet__item" @click="showMore = false">👤 Profile</router-link>
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
import { LiBottomSheet, LiButton, LiIcon, LiDropdown, LiThemeToggle, LiScrollProgress, LiCommandPalette, useTheme } from '../design-system/components/index.js'
import { useRouter } from 'vue-router'

const { user, signOut } = useAuth()
const showMore = ref(false)
const primaryNav = [
  { to: '/feed', label: 'Feed', icon: 'newspaper' },
  { to: '/meets', label: 'Meets', icon: 'sports_tennis' },
  { to: '/clubs', label: 'Clubs', icon: 'groups' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]
const moreNav = [
  { to: '/competitions', label: 'Competitions', icon: 'emoji_events' },
  { to: '/network', label: 'Network', icon: 'diversity_3' },
  { to: '/achievements', label: 'Achievements', icon: 'military_tech' },
  { to: '/challenges', label: 'Challenges', icon: 'flag' },
  { to: '/stats', label: 'Stats', icon: 'insights' },
]

const moreDropdown = ref(null)
function closeMore() { moreDropdown.value?.close?.() }
function signOutFromMore() { closeMore(); handleSignOut() }
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
      ...moreNav.map(n => ({ id: `go:${n.to}`, label: n.label })),
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'theme:toggle', label: 'Toggle theme', shortcut: ['Ctrl', 'K'] },
      { id: 'signout', label: 'Sign out' },
    ],
  },
]
function onCommand(cmd) {
  if (cmd.id.startsWith('go:')) router.push(cmd.id.slice(3))
  else if (cmd.id === 'theme:toggle') useTheme().toggle()
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
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky, 30);
  display: flex;
  align-items: center;
  gap: var(--space-s, 12px);
  padding: calc(var(--space-m, 16px) + env(safe-area-inset-top, 0px)) var(--space-l, 24px) var(--space-m, 16px);
  background: var(--glass-bg-light, rgba(255, 255, 255, 0.5));
  backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
  -webkit-backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
  border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
  isolation: isolate;
}
.app-header::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(120% 100% at 20% 0%, rgba(255, 213, 79, 0.25), transparent 60%);
  opacity: 0.7;
  pointer-events: none;
}
.app-header--scrolled {
  background: var(--glass-bg-light, rgba(255, 255, 255, 0.85));
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04));
  border-bottom-color: var(--glass-border-strong, rgba(255,188,37,0.18));
}
.app-header__mark { animation: lith-float 8s var(--ease-in-out-sine, ease-in-out) infinite; }
@media (prefers-reduced-motion: reduce) {
  .app-header__mark { animation: none; }
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
  color: var(--color-gray-900, #333333);
}

.app-header__bell {
  flex-shrink: 0;
}

.app-header__theme {
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

@media (max-width: 768px) {
  .app-header__title { display: none; }
  .app-main { padding: var(--space-m, 16px); }
}

/* ── Mobile bottom tab bar ── */
@media (max-width: 768px) {
  .app-header__nav--pills { display: none; }
  .app-main { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); }
}

.bottom-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .bottom-tab-bar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-sticky, 30);
    justify-content: space-around;
    background: var(--glass-bg-light, rgba(255, 255, 255, 0.85));
    backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
    -webkit-backdrop-filter: var(--glass-blur, blur(20px)) var(--glass-saturate, saturate(1.6));
    border-top: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
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
  color: var(--color-on-surface-variant, #666666);
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  border-radius: var(--radius-sm, 12px);
}

.bottom-tab-bar__item.router-link-active {
  color: var(--color-gray-900, #333333);
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
  color: var(--color-gray-900, #333333);
  font-weight: 600;
  border-radius: var(--radius-sm, 8px);
}

.more-sheet__item:hover {
  background: var(--color-gray-100, #F2F2F2);
}

.nav-pill { display: inline-flex; align-items: center; gap: var(--space-xs, 4px); }
.nav-pill__label { font-size: var(--text-xs, 14px); }
.bottom-tab-bar__item.router-link-active { color: var(--color-brand, #FFAF03); }
.more-item {
  display: inline-flex; align-items: center; gap: var(--space-s, 8px);
  padding: var(--space-s, 8px) var(--space-m, 12px);
  text-decoration: none; color: inherit; background: none; border: none; cursor: pointer; font: inherit;
}
@media (max-width: 768px) { .nav-pill__label { display: none; } .nav-pill { padding: 10px; } }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
