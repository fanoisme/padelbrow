# UI/UX Rework — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared infrastructure every other phase of the app-wide UI/UX rework depends on: a viewport-detection composable, a consistent page-header component, and a mobile-native bottom tab bar in `AppLayout` — plus the two app-wide navigation-link bugs found during the design audit.

**Architecture:** Three independent-but-sequential units. `useViewport` is a plain composable with no UI. `LiPageHeader` is a new Lithium design-system component built on the existing `LiRevealOnScroll`. `AppLayout` consumes both: it keeps the existing desktop pill nav untouched (its scroll overflow already absorbs two extra links) and adds a new mobile-only bottom tab bar + `LiBottomSheet` "More" panel, gated by CSS media queries (not JS), so no hydration/SSR concerns apply.

**Tech Stack:** Vue 3 (`<script setup>`), Vitest + @vue/test-utils, existing Lithium design-system components (`src/design-system/components/`), plain CSS custom properties (no Tailwind, no CSS-in-JS).

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-07-14-ui-ux-consistency-rework-design.md` — this plan implements only §2 (LiPageHeader), part of §4 (bottom tab bar, safe-area insets), and part of §5 (the `/stats`/`/challenges` app-wide link fix) of that spec.
- **No business-logic changes.** Composables that talk to Supabase, RPCs, computed values used elsewhere — untouched. This phase only adds new files and edits `AppLayout.vue`'s template/style/script for nav wiring.
- **Breakpoint convention (literal values only, CSS vars don't work in `@media`):** `480px` phone, `768px` tablet/nav-collapse, `1024px` wide desktop. Every `@media` rule in this phase uses these exact numbers.
- **No new npm dependencies.** Bottom tab bar icons are emoji (matching `HomeView.vue`'s existing `feature.icon` emoji convention) — not `LiIcon`, because `LiIcon` requires the "Material Symbols Outlined Variable" font, which is not loaded anywhere in this app (confirmed via grep) and adding it would be a new dependency this phase doesn't need.
- **Preserve existing `AppLayout.spec.js` assertions exactly:** text `'PADEL BROW'`, `img.app-header__mark`, `img.app-header__allo`, `'page content'` slot passthrough, `'Sign in'` when logged out, `'Clubs'`/`'Network'`/`'Profile'`/`'Sign out'` when logged in. All of these keep working because the existing desktop pill nav is not removed, only supplemented.
- **Teleported content in tests:** `LiBottomSheet` renders via `<Teleport to="body">`. `wrapper.text()` in Vue Test Utils does **not** see teleported content — assertions on the More sheet's contents must check `document.body.textContent`, not `wrapper.text()`.
- Touch targets on any new interactive element (bottom tab bar items, More-sheet rows) are at least 44×44px.
- Dark mode: use only the semantic tokens already defined in `tokens.css` (`--color-on-surface`, `--glass-bg-light`, etc.) — no new hardcoded hex colors.

## File Structure

- Create: `src/composables/useViewport.js` — reactive `isMobile` ref based on a `(max-width: 768px)` media query.
- Create: `src/composables/useViewport.spec.js`
- Create: `src/design-system/components/LiPageHeader.vue` — eyebrow/title/subtitle + `#actions` slot, wrapped in `LiRevealOnScroll`.
- Create: `src/design-system/components/LiPageHeader.spec.js`
- Modify: `src/design-system/components/index.js` — export `LiPageHeader`.
- Modify: `src/design-system/tokens.css` — add the breakpoint-convention doc comment (no functional CSS change).
- Modify: `src/layouts/AppLayout.vue` — add `/stats` + `/challenges` desktop pills, add the mobile bottom tab bar + "More" `LiBottomSheet`, add safe-area-inset padding.
- Modify: `src/layouts/AppLayout.spec.js` — add tests for the new links and the More sheet.

---

### Task 1: `useViewport` composable

**Files:**
- Create: `src/composables/useViewport.js`
- Test: `src/composables/useViewport.spec.js`

**Interfaces:**
- Produces: `useViewport(): { isMobile: Ref<boolean> }` — reactive, tracks `window.matchMedia('(max-width: 768px)')`. Consumed by later phases (e.g. Phase 2's `ClubsView` swaps `LiModal`↔`LiBottomSheet` based on this).

- [ ] **Step 1: Write the failing test**

Create `src/composables/useViewport.spec.js`:

```js
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useViewport } from './useViewport.js'

function mockMatchMedia(matches) {
  const mql = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return mql
}

describe('useViewport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports isMobile true when the 768px query matches', () => {
    mockMatchMedia(true)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('reports isMobile false when the 768px query does not match', () => {
    mockMatchMedia(false)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(false)
  })

  it('updates isMobile when the media query change fires', () => {
    const mql = mockMatchMedia(false)
    let result
    mount({
      setup() {
        result = useViewport()
        return () => null
      },
    })
    expect(result.isMobile.value).toBe(false)
    const handler = mql.addEventListener.mock.calls[0][1]
    handler({ matches: true })
    expect(result.isMobile.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composables/useViewport.spec.js`
Expected: FAIL with "Failed to resolve import './useViewport.js'" (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/composables/useViewport.js`:

```js
import { onMounted, onUnmounted, ref } from 'vue'

// Breakpoint convention for this app (see tokens.css comment block):
// 480px phone, 768px tablet/nav-collapse, 1024px wide desktop.
const MOBILE_QUERY = '(max-width: 768px)'

export function useViewport() {
  const isMobile = ref(false)
  let mql = null

  function handleChange(e) {
    isMobile.value = e.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(MOBILE_QUERY)
    isMobile.value = mql.matches
    mql.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    if (mql) mql.removeEventListener('change', handleChange)
  })

  return { isMobile }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/composables/useViewport.spec.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useViewport.js src/composables/useViewport.spec.js
git commit -m "feat(ui-rework): add useViewport composable for mobile-breakpoint detection"
```

---

### Task 2: `LiPageHeader` component

**Files:**
- Create: `src/design-system/components/LiPageHeader.vue`
- Test: `src/design-system/components/LiPageHeader.spec.js`
- Modify: `src/design-system/components/index.js:35-36` (insert export)

**Interfaces:**
- Consumes: `LiRevealOnScroll` (existing component, same directory, imported directly by relative path).
- Produces: `LiPageHeader` component with props `{ eyebrow?: string, title: string (required), subtitle?: string }` and an `#actions` slot rendered to the right of the title. Consumed by every view task in Phases 2-5.

- [ ] **Step 1: Write the failing test**

Create `src/design-system/components/LiPageHeader.spec.js`:

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiPageHeader from './LiPageHeader.vue'

describe('LiPageHeader', () => {
  it('renders the title, optional eyebrow and subtitle', () => {
    const wrapper = mount(LiPageHeader, {
      props: { title: 'Clubs', eyebrow: 'Community', subtitle: 'Find your padel crew' },
    })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Community')
    expect(wrapper.text()).toContain('Find your padel crew')
  })

  it('renders the actions slot next to the title when provided', () => {
    const wrapper = mount(LiPageHeader, {
      props: { title: 'Meets' },
      slots: { actions: '<button>Create meet</button>' },
    })
    expect(wrapper.find('.li-page-header__actions button').text()).toBe('Create meet')
  })

  it('omits the eyebrow and subtitle elements when not provided', () => {
    const wrapper = mount(LiPageHeader, { props: { title: 'Network' } })
    expect(wrapper.find('.li-page-header__eyebrow').exists()).toBe(false)
    expect(wrapper.find('.li-page-header__subtitle').exists()).toBe(false)
    expect(wrapper.find('.li-page-header__actions').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/components/LiPageHeader.spec.js`
Expected: FAIL with "Failed to resolve import './LiPageHeader.vue'" (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/design-system/components/LiPageHeader.vue`:

```vue
<template>
  <LiRevealOnScroll variant="fade-up">
    <div class="li-page-header">
      <div class="li-page-header__text">
        <span v-if="eyebrow" class="li-page-header__eyebrow">{{ eyebrow }}</span>
        <h1 class="li-page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="li-page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="li-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </LiRevealOnScroll>
</template>

<script setup>
import LiRevealOnScroll from './LiRevealOnScroll.vue'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.li-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-m, 16px);
}

.li-page-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.li-page-header__eyebrow {
  display: inline-block;
  width: fit-content;
  padding: 4px 12px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255, 255, 255, 0.35));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #666666);
  letter-spacing: 0.02em;
}

.li-page-header__title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-on-surface, #333333);
}

.li-page-header__subtitle {
  margin: 0;
  color: var(--color-on-surface-variant, #666666);
  font-size: 0.95rem;
}

.li-page-header__actions {
  display: flex;
  gap: var(--space-s, 8px);
  flex-wrap: wrap;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design-system/components/LiPageHeader.spec.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Export it from the barrel**

Edit `src/design-system/components/index.js` — insert this line immediately **before** the existing `LiPagination` export (alphabetical: `LiPageHeader` < `LiPagination`):

```js
export { default as LiPageHeader } from './LiPageHeader.vue'
```

So the surrounding lines read:

```js
export { default as LiMotion } from './LiMotion.vue'
export { default as LiPageHeader } from './LiPageHeader.vue'
export { default as LiPagination } from './LiPagination.vue'
export { default as LiParallaxSection } from './LiParallaxSection.vue'
```

- [ ] **Step 6: Run the full test suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: All existing tests still PASS, plus the 3 new `LiPageHeader` tests.

- [ ] **Step 7: Commit**

```bash
git add src/design-system/components/LiPageHeader.vue src/design-system/components/LiPageHeader.spec.js src/design-system/components/index.js
git commit -m "feat(ui-rework): add LiPageHeader component to the design system"
```

---

### Task 3: Breakpoint convention doc comment in `tokens.css`

**Files:**
- Modify: `src/design-system/tokens.css:1-9`

**Interfaces:**
- Produces: no functional change — a documentation comment every later phase's `@media` rules follow (480/768/1024px literal values).

- [ ] **Step 1: Add the comment block**

Edit `src/design-system/tokens.css` — insert this block immediately after the existing top-of-file comment (after line 8, `*/`) and before `:root {`:

```css
/*
  ══════════════════════════════════════════════════════════════
  BREAKPOINT CONVENTION (documentation only — CSS custom properties
  cannot be read inside @media conditions, so these are NOT tokens,
  just the literal pixel values every @media rule in this app must
  use consistently)

    480px  — phone
    768px  — tablet / nav collapse point (AppLayout switches from
             the desktop pill nav to the mobile bottom tab bar here)
    1024px — wide desktop content cap

  Always write `@media (max-width: 480px)` / `768px` / `1024px`
  literally — do not invent new breakpoint values.
  ══════════════════════════════════════════════════════════════
*/
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: All tests PASS (this is a comment-only CSS change, no behavior affected).

- [ ] **Step 3: Commit**

```bash
git add src/design-system/tokens.css
git commit -m "docs(ui-rework): document the app's breakpoint convention in tokens.css"
```

---

### Task 4: `AppLayout` — mobile bottom tab bar + nav-link fixes

**Files:**
- Modify: `src/layouts/AppLayout.vue` (full rewrite of template/script/style)
- Modify: `src/layouts/AppLayout.spec.js` (add 2 tests)

**Interfaces:**
- Consumes: `LiBottomSheet`, `LiButton` (from `../design-system/components/index.js`), `useAuth()` (existing, unchanged).
- Produces: no new exports — this is a leaf layout component.

**Nav-fix context (from spec §5):** `/stats` (`PersonalStatsView`) and `/challenges` (`ChallengesView`) are real routes in `router/index.js` with **zero** nav link anywhere today. This task adds them to the desktop pill nav (which already has `overflow-x: auto` — the two extra pills scroll gracefully, no crowding fix needed) and to the mobile "More" sheet.

- [ ] **Step 1: Write the failing tests**

Edit `src/layouts/AppLayout.spec.js` — replace the whole file with:

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppLayout from './AppLayout.vue'

const signOut = vi.fn().mockResolvedValue()
// Renders slot content so link text is visible in wrapper.text() — the
// default `RouterLink: true` stub does not render its default slot.
const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref(null), signOut })),
}))

import { useAuth } from '../composables/useAuth.js'
import { vi } from 'vitest'

describe('AppLayout', () => {
  it('renders the PADEL BROW mark, Allo Bank logo, title, and slot content', () => {
    useAuth.mockReturnValue({ user: ref(null), signOut })
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' },
      global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } },
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.find('img.app-header__mark').exists()).toBe(true)
    expect(wrapper.find('img.app-header__allo').exists()).toBe(true)
    expect(wrapper.html()).toContain('page content')
  })

  it('shows a sign-in link when logged out', () => {
    useAuth.mockReturnValue({ user: ref(null), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Sign in')
  })

  it('shows nav links and a sign-out button when logged in', () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Clubs')
    expect(wrapper.text()).toContain('Network')
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('Sign out')
  })

  it('includes Stats and Challenges links when logged in (previously unreachable routes)', () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, { global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } } })
    expect(wrapper.text()).toContain('Stats')
    expect(wrapper.text()).toContain('Challenges')
  })

  it('opens the mobile More sheet and shows the secondary destinations', async () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }), signOut })
    const wrapper = mount(AppLayout, {
      global: { stubs: { RouterLink: RouterLinkStub, NotificationsBell: true } },
      attachTo: document.body,
    })
    const moreBtn = wrapper.find('[data-testid="bottom-nav-more"]')
    expect(moreBtn.exists()).toBe(true)
    await moreBtn.trigger('click')
    // LiBottomSheet renders via <Teleport to="body">, so assert against the
    // document body, not wrapper.text() — Vue Test Utils doesn't include
    // teleported content in the component's own text()/html().
    expect(document.body.textContent).toContain('Competitions')
    expect(document.body.textContent).toContain('Network')
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `npx vitest run src/layouts/AppLayout.spec.js`
Expected: FAIL — `'Stats'`/`'Challenges'` not found in text, and `[data-testid="bottom-nav-more"]` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Replace `src/layouts/AppLayout.vue` in full:

```vue
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
        <router-link to="/stats" class="nav-pill">Stats</router-link>
        <router-link to="/achievements" class="nav-pill">Achievements</router-link>
        <router-link to="/challenges" class="nav-pill">Challenges</router-link>
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

    <nav v-if="user" class="bottom-tab-bar" aria-label="Primary">
      <router-link to="/feed" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true">📰</span>
        <span class="bottom-tab-bar__label">Feed</span>
      </router-link>
      <router-link to="/meets" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true">🎾</span>
        <span class="bottom-tab-bar__label">Meets</span>
      </router-link>
      <router-link to="/clubs" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true">🏛️</span>
        <span class="bottom-tab-bar__label">Clubs</span>
      </router-link>
      <router-link to="/leaderboard" class="bottom-tab-bar__item">
        <span class="bottom-tab-bar__icon" aria-hidden="true">📊</span>
        <span class="bottom-tab-bar__label">Leaderboard</span>
      </router-link>
      <button type="button" class="bottom-tab-bar__item" data-testid="bottom-nav-more" @click="showMore = true">
        <span class="bottom-tab-bar__icon" aria-hidden="true">⋯</span>
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import NotificationsBell from '../components/notifications/NotificationsBell.vue'
import { LiBottomSheet, LiButton } from '../design-system/components/index.js'

const { user, signOut } = useAuth()
const showMore = ref(false)

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
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/layouts/AppLayout.spec.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/AppLayout.vue src/layouts/AppLayout.spec.js
git commit -m "feat(ui-rework): mobile bottom tab bar + fix unreachable /stats and /challenges nav links"
```

---

## Self-Review

**1. Spec coverage:** §2 (LiPageHeader) → Task 2. §4's bottom-tab-bar/safe-area/breakpoint-convention items → Tasks 3-4. §5's `/stats`/`/challenges` app-wide link fix → Task 4. The `club-feed` link and `MeetDetailView` Matches-tab fixes from §5 are intentionally **not** in this phase — they belong to Phase 2 (ClubDetailView) and Phase 3 (MeetDetailView) respectively, alongside those views' own restyle, since they're single-view template edits, not shared infrastructure.

**2. Placeholder scan:** No TBD/TODO; every step has complete code.

**3. Type consistency:** `useViewport()` returns `{ isMobile }` — this exact shape is what Phase 2's `ClubsView` task will destructure. `LiPageHeader` props (`eyebrow`, `title`, `subtitle`) and the `#actions` slot name are what every Phase 2-5 view task will use — confirmed consistent naming throughout.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-14-ui-ux-rework-phase-1-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
