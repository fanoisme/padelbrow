# Immersive Redesign — Phase 0 (Foundation) + Phase 1 (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dual-mode theme system + signature motion kit + immersive app shell that every later view phase depends on — the foundation that turns "kaku/traditional" into immersive/playful/premium.

**Architecture:** Additive to the vendored Lithium design system under `src/design-system/`. New stateful composables (`useTheme`, `useCursorAwareness`, `useParticles`) use the module-level singleton pattern already established by `useToast`. New presentational components (`LiThemeToggle`, `LiScrollProgress`, `LiConfetti`, `LiSparkle`, `LiHero`) follow the `<script setup>` + scoped-CSS + reduced-motion pattern of `LiButton`/`LiGlassCard`. The shell (`AppLayout.vue`) gains ambient mesh + nav consolidation + theme toggle + page transitions. No business logic, no new npm deps.

**Tech Stack:** Vue 3 (`<script setup>`) · Vite · vue-router (hash) · Vitest + `@vue/test-utils` (jsdom) · existing Lithium tokens (`src/design-system/tokens.css`) + Design Guide (`../../Design Guide/DESIGN.md`).

**Spec:** [`docs/superpowers/specs/2026-07-15-immersive-redesign-design.md`](../specs/2026-07-15-immersive-redesign-design.md) — §3 (foundation) and §4 (shell).

**Conventions (apply to every task):**
- Run a single view's existing spec + the design-system smoke spec after touching shared code: `npm test` (full) or `npx vitest run <path>`.
- Every new component/composable is exported from `src/design-system/components/index.js` (the barrel) in the same commit it is created.
- All motion has a guide easing + duration token; every animated component includes a `@media (prefers-reduced-motion: reduce)` fallback.
- Use semantic tokens (`--color-on-surface`, `--glass-bg-*`, `--gradient-*`); no raw hex in new markup so dark mode (already in `tokens.css` under `[data-theme="dark"]`) keeps working.
- Preserve every existing `data-testid`. Commit after each task (conventional messages, `feat(immersive-redesign): …`).

---

## Phase 0 — Foundation

### Task 1: `useTheme` composable (dual-mode state, persistence, system preference)

**Files:**
- Create: `src/design-system/composables/useTheme.js`
- Create: `src/design-system/composables/useTheme.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/composables/useTheme.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('initialises from localStorage when a valid theme is stored', async () => {
    localStorage.setItem('padelbrow-theme', 'dark')
    const { useTheme } = await import('./useTheme.js')
    const { isDark, theme } = useTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('falls back to prefers-color-scheme when nothing is stored', async () => {
    vi.stubGlobal('matchMedia', (q) => ({
      matches: q.includes('dark'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { useTheme } = await import('./useTheme.js')
    expect(useTheme().isDark.value).toBe(true)
  })

  it('toggle() flips the theme, persists it, and updates data-theme', async () => {
    const { useTheme } = await import('./useTheme.js')
    const { theme, isDark, toggle } = useTheme()
    const before = isDark.value
    toggle()
    expect(isDark.value).toBe(!before)
    expect(localStorage.getItem('padelbrow-theme')).toBe(theme.value)
    expect(document.documentElement.dataset.theme).toBe(theme.value)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/composables/useTheme.spec.js`
Expected: FAIL — `Cannot find module './useTheme.js'`.

- [ ] **Step 3: Write the implementation**

```js
// src/design-system/composables/useTheme.js
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
```

- [ ] **Step 4: Add the barrel export**

In `src/design-system/components/index.js`, append with the other composable exports (after the `useToast` line):

```js
export { useTheme } from '../composables/useTheme.js'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/composables/useTheme.spec.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/composables/useTheme.js src/design-system/composables/useTheme.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add useTheme dual-mode theme singleton"
```

---

### Task 2: Load Material Symbols font (enables `LiIcon` app-wide)

`LiIcon.vue` and `LiMagneticButton.vue` both reference the "Material Symbols" font, but it is not loaded anywhere (confirmed by grep; the prior rework deliberately used emoji because of this). Loading it lets us replace emoji chrome with crisp icons.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add preconnect + font stylesheet to `<head>`**

In `index.html`, inside `<head>`, after the `<title>` line add:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
    />
```

- [ ] **Step 2: Smoke-verify `LiIcon` renders a glyph**

Run: `npx vitest run src/design-system/smoke.spec.js`
Expected: PASS (no regressions — LiIcon already renders the name as text; the font only affects the browser, not jsdom).

- [ ] **Step 3: Manual verify (dev server)**

Run: `npm run dev`, open the app, confirm `LiIcon name="dark_mode"` (temporarily mounted anywhere) shows a moon glyph, not the word "dark_mode".
> **Known trade-off (document in commit body):** icons need this network font, so icon glyphs degrade to text when fully offline. Acceptable — the app already requires network for Supabase; a future task can self-host the font for full PWA offline.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(immersive-redesign): load Material Symbols font for LiIcon chrome"
```

---

### Task 3: `LiThemeToggle` component

**Files:**
- Create: `src/design-system/components/LiThemeToggle.vue`
- Create: `src/design-system/components/LiThemeToggle.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/components/LiThemeToggle.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LiThemeToggle from './LiThemeToggle.vue'

describe('LiThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('renders a 44x44 button with an accessible label and pressed state', () => {
    const wrapper = mount(LiThemeToggle)
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toMatch(/theme/i)
    expect(btn.attributes('aria-pressed')).toBeDefined()
  })

  it('flips the theme on click', async () => {
    const wrapper = mount(LiThemeToggle)
    const before = wrapper.find('button').attributes('aria-pressed') === 'true'
    await wrapper.find('button').trigger('click')
    const after = wrapper.find('button').attributes('aria-pressed') === 'true'
    expect(after).toBe(!before)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/components/LiThemeToggle.spec.js`
Expected: FAIL — `Cannot find module './LiThemeToggle.vue'`.

- [ ] **Step 3: Write the component**

```vue
<!-- src/design-system/components/LiThemeToggle.vue -->
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
import { computed } from 'vue'
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
}
</style>
```

- [ ] **Step 4: Add the barrel export**

In `src/design-system/components/index.js`, alphabetically near `LiTextField`/`LiToast`:

```js
export { default as LiThemeToggle } from './LiThemeToggle.vue'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/components/LiThemeToggle.spec.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/components/LiThemeToggle.vue src/design-system/components/LiThemeToggle.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add LiThemeToggle component"
```

---

### Task 4: Theme bootstrap in `App.vue` (apply before first paint)

`useTheme` initialises lazily on first call; mounting the toggle drives that, but we want `data-theme` set as early as possible so authed views don't flash the wrong theme.

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Initialise theme on app setup**

Replace the `<script setup>` block of `src/App.vue` with:

```js
import AppLayout from './layouts/AppLayout.vue'
import { LiToast } from './design-system/components/index.js'
import { useTheme } from './design-system/components/index.js'

// Initialise the theme singleton — sets <html data-theme> from storage /
// prefers-color-scheme before the first authed view paints.
useTheme()
```

(The `<template>` block stays unchanged.)

- [ ] **Step 2: Verify**

Run: `npx vitest run`
Expected: full suite PASS (no template change → no view spec impacted).

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat(immersive-redesign): bootstrap theme before first paint in App.vue"
```

---

### Task 5: Noise-texture utility + `textured` prop on glass surfaces

Guide §1C: glass gets a 3–8% SVG-noise overlay to kill the "digital plastic" look. Implement as one `.li-textured` global class plus a `textured` prop on the two glass components.

**Files:**
- Modify: `src/design-system/tokens.css` (add the global utility class at the end of the file, before the reduced-motion keyframe block is fine — append after line 751 `lith-skeleton-wave` keyframe)
- Modify: `src/design-system/components/LiGlassCard.vue`
- Modify: `src/design-system/components/LiGlassPanel.vue`

- [ ] **Step 1: Add the global noise utility class**

Append to `src/design-system/tokens.css`:

```css
/* ══════════════════════════════════════════════════════════════
   NOISE TEXTURE UTILITY (Design Guide §1C)
   Layer a 2px SVG noise tile at low opacity over large surfaces to
   break the flat "digital plastic" sheen. Use on glass cards/panels/
   modal backdrops — NOT on small elements (buttons, inputs, badges),
   where noise reads dirty.
   ══════════════════════════════════════════════════════════════ */
.li-textured::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: var(--glass-noise-opacity, 0.03);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
[data-theme="dark"] .li-textured::after { opacity: 0.06; }
```

- [ ] **Step 2: Add the `textured` prop to `LiGlassCard`**

The noise overlay must clip to the card's rounded shape, so the class goes on the inner **`.li-glass-card__surface`** element (it carries the border-radius + `overflow: hidden` + `position: relative`) — not the root, which has no radius and would clip square.

In `src/design-system/components/LiGlassCard.vue`:

(a) Add the class binding on the **surface** div — change `<div class="li-glass-card__surface">` to:

```vue
    <div class="li-glass-card__surface" :class="{ 'li-textured': textured }">
```

(b) Add the prop inside `defineProps({ ... })` (after `radius`):

```js
  /** Overlay a subtle noise texture (Design Guide §1C). Set false for compact/dense uses. */
  textured: { type: Boolean, default: true },
```

(The global `.li-textured::after` inherits the surface's `border-radius` and is clipped by its `overflow: hidden`. The surface already uses `::before` for the top glow, so `::after` is free.)

- [ ] **Step 3: Add the same `textured` prop to `LiGlassPanel`**

`LiGlassPanel`'s root `.li-glass-panel` already has `border-radius` + `overflow: hidden` + `position: relative`, so the class goes on the root.

In `src/design-system/components/LiGlassPanel.vue`:

(a) Extend the root class binding — change `:class="{ 'li-glass-panel--accent': accent }"` to:

```vue
  <div class="li-glass-panel" :class="{ 'li-glass-panel--accent': accent, 'li-textured': textured }">
```

(b) Add the prop — change `defineProps({ accent: { type: Boolean, default: false } })` to:

```js
defineProps({
  accent: { type: Boolean, default: false },
  textured: { type: Boolean, default: true },
})
```

- [ ] **Step 4: Verify**

Run: `npx vitest run`
Expected: PASS (props are additive; existing mounts don't pass `textured` so defaults apply).

- [ ] **Step 5: Manual verify (dev server)**

`npm run dev` → confirm a `LiGlassCard` shows a faint grain in light mode and slightly stronger grain in dark mode; confirm a small use (e.g. inside a button) does not get the class.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/tokens.css src/design-system/components/LiGlassCard.vue src/design-system/components/LiGlassPanel.vue
git commit -m "feat(immersive-redesign): add noise-texture utility + textured prop on glass"
```

---

### Task 6: `LiScrollProgress` component (top reading bar)

Guide §1I: a 3px brand-gradient progress bar at the top of the viewport.

**Files:**
- Create: `src/design-system/components/LiScrollProgress.vue`
- Create: `src/design-system/components/LiScrollProgress.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/components/LiScrollProgress.spec.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiScrollProgress from './LiScrollProgress.vue'

describe('LiScrollProgress', () => {
  it('renders a fixed bar with the brand gradient class', () => {
    const wrapper = mount(LiScrollProgress)
    const bar = wrapper.find('.li-scroll-progress__bar')
    expect(bar.exists()).toBe(true)
    expect(wrapper.find('.li-scroll-progress').classes()).toContain('li-scroll-progress')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/components/LiScrollProgress.spec.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```vue
<!-- src/design-system/components/LiScrollProgress.vue -->
<template>
  <!-- Top-of-viewport scroll progress bar (Design Guide §1I). -->
  <div class="li-scroll-progress" aria-hidden="true">
    <div class="li-scroll-progress__bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
let raf = 0

function update() {
  raf = 0
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
}

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(update)
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style scoped>
.li-scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: var(--z-cursor, 70);
  pointer-events: none;
}
.li-scroll-progress__bar {
  height: 100%;
  transform-origin: left center;
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  transition: transform 100ms linear;
}
@media (prefers-reduced-motion: reduce) {
  .li-scroll-progress__bar { transition: none; }
}
</style>
```

- [ ] **Step 4: Add the barrel export**

```js
export { default as LiScrollProgress } from './LiScrollProgress.vue'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/components/LiScrollProgress.spec.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/components/LiScrollProgress.vue src/design-system/components/LiScrollProgress.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add LiScrollProgress top bar"
```

---

### Task 7: `useCursorAwareness` composable (spotlight + tilt + magnetic, desktop-only)

Guide §1B: cursor spotlight on mesh, 3D tilt on cards, magnetic pull on CTAs. Desktop-only (pointer: fine), reduced-motion safe. Extracts the math already in `LiMagneticButton` so any element can opt in.

**Files:**
- Create: `src/design-system/composables/useCursorAwareness.js`
- Create: `src/design-system/composables/useCursorAwareness.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/composables/useCursorAwareness.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useCursorAwareness', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

  it('reports disabled under prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(false)
  })

  it('reports disabled on touch (coarse pointer)', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('coarse'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(false)
  })

  it('reports enabled on a fine-pointer, motion-ok desktop', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    expect(useCursorAwareness().enabled.value).toBe(true)
  })

  it('magnetic() returns a zero offset handler set when disabled', async () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const { useCursorAwareness } = await import('./useCursorAwareness.js')
    const m = useCursorAwareness().magnetic()
    expect(m.style.value.transform).toBe('translate(0px, 0px)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/composables/useCursorAwareness.spec.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/design-system/composables/useCursorAwareness.js
import { ref, computed } from 'vue'

/**
 * useCursorAwareness — desktop-only (pointer: fine), reduced-motion-safe
 * cursor effects (Design Guide §1B): spotlight, 3D tilt, magnetic pull.
 * Callers gate the actual listeners on `enabled`.
 */
function prefers(query) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

export function useCursorAwareness() {
  const reducedMotion = prefers('(prefers-reduced-motion: reduce)')
  const coarsePointer = prefers('(pointer: coarse)')
  const enabled = computed(() => !reducedMotion && !coarsePointer)

  /**
   * magnetic(opts?) — returns { onMove, onLeave, style } for a ref-bound element.
   * style is a reactive object for :style binding (translate toward cursor).
   */
  function magnetic(opts = {}) {
    const strength = opts.strength ?? 4
    const x = ref(0)
    const y = ref(0)
    const style = computed(() => ({ transform: `translate(${x.value}px, ${y.value}px)` }))

    function onMove(e, el) {
      if (!enabled.value || !el) return
      const rect = el.getBoundingClientRect()
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
      x.value = Math.round(dx * strength * 10) / 10
      y.value = Math.round(dy * strength * 10) / 10
    }
    function onLeave() { x.value = 0; y.value = 0 }

    return { onMove, onLeave, style }
  }

  /**
   * tilt(opts?) — returns { onMove, onLeave, style } producing a rotateX/rotateY
   * transform tracked to the cursor (max --rotate-dynamic).
   */
  function tilt(opts = {}) {
    const maxDeg = opts.maxDeg ?? 8
    const rx = ref(0)
    const ry = ref(0)
    const style = computed(() => ({
      transform: `perspective(1000px) rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
    }))

    function onMove(e, el) {
      if (!enabled.value || !el) return
      const rect = el.getBoundingClientRect()
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
      ry.value = Math.round(dx * maxDeg * 10) / 10
      rx.value = Math.round(-dy * maxDeg * 10) / 10
    }
    function onLeave() { rx.value = 0; ry.value = 0 }

    return { onMove, onLeave, style }
  }

  return { enabled, magnetic, tilt }
}
```

- [ ] **Step 4: Add the barrel export**

```js
export { useCursorAwareness } from '../composables/useCursorAwareness.js'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/composables/useCursorAwareness.spec.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/composables/useCursorAwareness.js src/design-system/composables/useCursorAwareness.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add useCursorAwareness (spotlight/tilt/magnetic)"
```

---

### Task 8: `useParticles` composable (confetti + sparkle, CSS-only, reduced-motion safe)

Guide §1D: celebratory particle bursts. Imperative API; declarative wrappers come in Task 9.

**Files:**
- Create: `src/design-system/composables/useParticles.js`
- Create: `src/design-system/composables/useParticles.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/composables/useParticles.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useParticles', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('confetti spawns the requested count inside a container attached to origin parent', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const origin = document.createElement('div')
    document.body.appendChild(origin)
    const { useParticles } = require('./useParticles.js')
    const { confetti } = useParticles()
    confetti(origin, { count: 12 })
    const layer = origin.querySelector('.li-particles')
    expect(layer).not.toBeNull()
    expect(layer.querySelectorAll('.li-particles__p').length).toBe(12)
  })

  it('confetti is a no-op under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduced-motion'), media: q }))
    const origin = document.createElement('div')
    const { useParticles } = require('./useParticles.js')
    useParticles().confetti(origin, { count: 12 })
    expect(origin.querySelector('.li-particles')).toBeNull()
  })

  it('sparkle spawns 4–6 particles', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const origin = document.createElement('div')
    document.body.appendChild(origin)
    const { useParticles } = require('./useParticles.js')
    useParticles().sparkle(origin, { count: 5 })
    expect(origin.querySelector('.li-particles').querySelectorAll('.li-particles__p').length).toBe(5)
  })
})
```

> Note: these tests use `require` (CommonJS dynamic) because Vitest resolves it fine in jsdom and avoids top-level `await` import + singleton pitfalls for this pure-function module. `useParticles` has no module-level state, so `require`/`import` are equivalent here.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/composables/useParticles.spec.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/design-system/composables/useParticles.js
/**
 * useParticles — CSS-only confetti + sparkle bursts (Design Guide §1D).
 * Spawns a transient layer inside the origin element's positioning context,
 * then removes it after the lifespan. No-op under prefers-reduced-motion.
 * The actual motion is CSS keyframes (lith-confetti-fall / lith-sparkle)
 * already defined in tokens.css; this composable only creates the DOM.
 */

const CONFETTI_COLORS = [
  'var(--confetti-color-1, #F9C700)',
  'var(--confetti-color-2, #FF8C00)',
  'var(--confetti-color-3, #FFAF03)',
]

function reducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function spawn(origin, { count, className, lifespan, styleFn }) {
  if (!origin || reducedMotion()) return
  if (getComputedStyle(origin).position === 'static') origin.style.position = 'relative'

  const layer = document.createElement('div')
  layer.className = 'li-particles'
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, {
    position: 'absolute', inset: '0', overflow: 'visible', pointerEvents: 'none',
  })

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = `li-particles__p ${className}`
    styleFn(p, i, count)
    layer.appendChild(p)
  }

  origin.appendChild(layer)
  setTimeout(() => layer.remove(), lifespan)
}

export function useParticles() {
  function confetti(origin, opts = {}) {
    const count = opts.count ?? 16
    const lifespan = opts.lifespan ?? 1200
    spawn(origin, {
      count, className: 'li-particles__p--confetti', lifespan,
      styleFn: (p, i) => {
        const angle = (Math.PI * 2 * i) / count
        const dist = 40 + (i % 5) * 12
        const size = 4 + (i % 3) * 3
        Object.assign(p.style, {
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${size}px`, height: `${size}px`,
          borderRadius: '2px',
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `lith-confetti-fall ${lifespan}ms cubic-bezier(0.4,0,0.2,1) forwards`,
          ['--confetti-rotation']: `${(i * 53) % 720}deg`,
          transform: `translate(-50%, -50%) translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
        })
      },
    })
  }

  function sparkle(origin, opts = {}) {
    const count = opts.count ?? 5
    const lifespan = opts.lifespan ?? 800
    spawn(origin, {
      count, className: 'li-particles__p--sparkle', lifespan,
      styleFn: (p, i) => {
        const size = 6
        const ox = (i - count / 2) * 14
        const oy = (i % 2 ? -1 : 1) * 10
        Object.assign(p.style, {
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${size}px`, height: `${size}px`,
          background: 'var(--sparkle-color, rgba(255,255,255,0.9))',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          animation: `lith-sparkle ${lifespan}ms cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms forwards`,
          transform: `translate(-50%, -50%) translate(${ox}px, ${oy}px)`,
        })
      },
    })
  }

  return { confetti, sparkle }
}
```

- [ ] **Step 4: Add the barrel export**

```js
export { useParticles } from '../composables/useParticles.js'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/composables/useParticles.spec.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/composables/useParticles.js src/design-system/composables/useParticles.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add useParticles (confetti + sparkle)"
```

---

### Task 9: `LiConfetti` + `LiSparkle` declarative wrapper components

**Files:**
- Create: `src/design-system/components/LiConfetti.vue`
- Create: `src/design-system/components/LiSparkle.vue`
- Create: `src/design-system/components/LiParticles.spec.js`
- Modify: `src/design-system/components/index.js` (add 2 exports)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/components/LiParticles.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LiConfetti from './LiConfetti.vue'
import LiSparkle from './LiSparkle.vue'

describe('LiConfetti / LiSparkle', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('LiConfetti renders a positioned container root', () => {
    const w = mount(LiConfetti)
    expect(w.find('.li-confetti').exists()).toBe(true)
  })

  it('LiSparkle fires sparkles on the root when trigger flips to true', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, media: '' }))
    const w = mount(LiSparkle, { props: { trigger: false } })
    expect(w.find('.li-particles').exists()).toBe(false)
    await w.setProps({ trigger: true })
    expect(w.find('.li-particles').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/components/LiParticles.spec.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `LiConfetti.vue`**

```vue
<!-- src/design-system/components/LiConfetti.vue -->
<template>
  <!--
    LiConfetti · declarative confetti burst.
    Fires when `trigger` flips to true (or on mount when fire-on-mount). Emits @fired.
  -->
  <div ref="root" class="li-confetti">
    <slot />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useParticles } from '../composables/useParticles.js'

const props = defineProps({
  trigger: { type: Boolean, default: null },
  fireOnMount: { type: Boolean, default: false },
  count: { type: Number, default: 16 },
  lifespan: { type: Number, default: 1200 },
})
const emit = defineEmits(['fired'])
const root = ref(null)
const { confetti } = useParticles()

function fire() {
  if (root.value) { confetti(root.value, { count: props.count, lifespan: props.lifespan }); emit('fired') }
}
watch(() => props.trigger, (v) => { if (v) fire() })
onMounted(() => { if (props.fireOnMount) fire() })
</script>

<style scoped>
.li-confetti { position: relative; }
</style>
```

- [ ] **Step 4: Write `LiSparkle.vue`**

```vue
<!-- src/design-system/components/LiSparkle.vue -->
<template>
  <div ref="root" class="li-sparkle">
    <slot />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useParticles } from '../composables/useParticles.js'

const props = defineProps({
  trigger: { type: Boolean, default: null },
  fireOnMount: { type: Boolean, default: false },
  count: { type: Number, default: 5 },
  lifespan: { type: Number, default: 800 },
})
const emit = defineEmits(['fired'])
const root = ref(null)
const { sparkle } = useParticles()

function fire() {
  if (root.value) { sparkle(root.value, { count: props.count, lifespan: props.lifespan }); emit('fired') }
}
watch(() => props.trigger, (v) => { if (v) fire() })
onMounted(() => { if (props.fireOnMount) fire() })
</script>

<style scoped>
.li-sparkle { position: relative; }
</style>
```

- [ ] **Step 5: Add barrel exports**

```js
export { default as LiConfetti } from './LiConfetti.vue'
export { default as LiSparkle } from './LiSparkle.vue'
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/design-system/components/LiParticles.spec.js`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/design-system/components/LiConfetti.vue src/design-system/components/LiSparkle.vue src/design-system/components/LiParticles.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add LiConfetti + LiSparkle declarative wrappers"
```

---

### Task 10: `LiHero` component (immersive page hero — mesh + cascade + spotlight)

Guide §1B/§3/§5.5: reusable hero with mandatory mesh, reveal cascade, gradient title, desktop cursor spotlight.

**Files:**
- Create: `src/design-system/components/LiHero.vue`
- Create: `src/design-system/components/LiHero.spec.js`
- Modify: `src/design-system/components/index.js` (add export)

- [ ] **Step 1: Write the failing test**

```js
// src/design-system/components/LiHero.spec.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LiHero from './LiHero.vue'

describe('LiHero', () => {
  it('renders eyebrow, gradient title, subtitle and an actions slot over a mesh', () => {
    const w = mount(LiHero, {
      props: { eyebrow: 'Community', title: 'Meets', subtitle: 'Book a match' },
      slots: { actions: '<button>Create</button>' },
    })
    expect(w.find('.li-mesh').exists()).toBe(true)
    expect(w.text()).toContain('Community')
    expect(w.text()).toContain('Meets')
    expect(w.text()).toContain('Book a match')
    expect(w.find('.li-hero__actions button').text()).toBe('Create')
  })

  it('omits eyebrow/subtitle/actions when not provided', () => {
    const w = mount(LiHero, { props: { title: 'Stats' } })
    expect(w.find('.li-hero__eyebrow').exists()).toBe(false)
    expect(w.find('.li-hero__subtitle').exists()).toBe(false)
    expect(w.find('.li-hero__actions').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/components/LiHero.spec.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```vue
<!-- src/design-system/components/LiHero.vue -->
<template>
  <!--
    LiHero · immersive page hero (Design Guide §1B/§3/§5.5).
    Mandatory LiMeshBackground + reveal cascade + gradient title + desktop spotlight.
    variant maps to LiMeshBackground variants: warm | cool | dark.
  -->
  <section class="li-hero" :class="`li-hero--${variant}`" @mousemove="onSpotlight">
    <LiMeshBackground :variant="variant" :intensity="intensity" />
    <div class="li-hero__spotlight" aria-hidden="true" :style="spotlightStyle" />
    <div class="li-hero__inner">
      <LiRevealOnScroll variant="fade-down" :duration="500">
        <span v-if="eyebrow" class="li-hero__eyebrow">{{ eyebrow }}</span>
      </LiRevealOnScroll>
      <LiRevealOnScroll variant="fade-up" :delay="80" :duration="700">
        <h1 class="li-hero__title"><LiGradientText>{{ title }}</LiGradientText></h1>
      </LiRevealOnScroll>
      <LiRevealOnScroll v-if="subtitle" variant="fade-up" :delay="160" :duration="700">
        <p class="li-hero__subtitle">{{ subtitle }}</p>
      </LiRevealOnScroll>
      <LiRevealOnScroll v-if="$slots.actions" variant="fade-up" :delay="240" :duration="700">
        <div class="li-hero__actions"><slot name="actions" /></div>
      </LiRevealOnScroll>
      <slot />
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import LiMeshBackground from './LiMeshBackground.vue'
import LiRevealOnScroll from './LiRevealOnScroll.vue'
import LiGradientText from './LiGradientText.vue'
import { useCursorAwareness } from '../composables/useCursorAwareness.js'

const props = defineProps({
  variant: { type: String, default: 'warm', validator: (v) => ['warm', 'cool', 'dark'].includes(v) },
  intensity: { type: String, default: 'medium', validator: (v) => ['subtle', 'medium', 'vivid'].includes(v) },
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})

const { enabled } = useCursorAwareness()
const sx = ref(50)
const sy = ref(0)
const spotlightStyle = computed(() => ({
  opacity: enabled.value ? 1 : 0,
  background: `radial-gradient(200px circle at ${sx.value}% ${sy.value}%, var(--spotlight-color, rgba(255,188,37,0.05)), transparent 70%)`,
}))
function onSpotlight(e) {
  if (!enabled.value) return
  const r = e.currentTarget.getBoundingClientRect()
  sx.value = ((e.clientX - r.left) / r.width) * 100
  sy.value = ((e.clientY - r.top) / r.height) * 100
}
</script>

<style scoped>
.li-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-3xl, 64px);
  padding: var(--space-5xl, 96px) var(--space-2xl, 32px);
  margin-bottom: var(--space-3xl, 48px);
  isolation: isolate;
}
.li-hero__spotlight { position: absolute; inset: 0; z-index: 1; pointer-events: none; transition: opacity var(--dur-medium, 300ms) var(--ease-out, ease); }
.li-hero__inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-l, 16px); margin: 0 auto; max-width: 820px; }
.li-hero__eyebrow {
  display: inline-block; padding: 6px 14px; border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255,255,255,0.35)); border: 1px solid var(--glass-border, rgba(255,255,255,0.12));
  font-size: 0.8rem; font-weight: 600; color: var(--color-on-surface-variant, #666); letter-spacing: 0.02em;
}
.li-hero__title { font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; margin: 0; }
.li-hero__subtitle { font-size: clamp(1rem, 2vw, 1.25rem); color: var(--color-on-surface-variant, #666); max-width: 560px; margin: 0; }
.li-hero__actions { display: flex; flex-wrap: wrap; gap: var(--space-m, 12px); justify-content: center; margin-top: var(--space-s, 8px); }
@media (max-width: 768px) { .li-hero { padding: var(--space-3xl, 48px) var(--space-l, 16px); border-radius: var(--radius-xl, 32px); } }
</style>
```

- [ ] **Step 4: Add the barrel export**

```js
export { default as LiHero } from './LiHero.vue'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/design-system/components/LiHero.spec.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/design-system/components/LiHero.vue src/design-system/components/LiHero.spec.js src/design-system/components/index.js
git commit -m "feat(immersive-redesign): add LiHero immersive page hero"
```

---

### Task 11: Page transitions via Vue `<Transition>` on `<router-view>`

Guide §1J: choreographed push/pop page transitions. Implemented with Vue's built-in `<Transition>` (reliable cross-browser, reduced-motion safe). The native View Transitions API for shared-element morphs is a documented future enhancement — not required for the immersive feel and not worth risking broken navigation.

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Wrap `<router-view>` in a `<Transition>`**

Replace the whole of `src/App.vue` with:

```vue
<template>
  <AppLayout>
    <router-view v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'li-page'" mode="out-in">
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
/* Page transition — slide + dim. Guide §1J. Reduced-motion collapses to a fade. */
.li-page-enter-active,
.li-page-leave-active {
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
```

- [ ] **Step 2: Verify**

Run: `npm run build` (ensures the new template compiles cleanly).
Expected: build succeeds, no Vue warnings about `<router-view>` slot usage.

- [ ] **Step 3: Manual verify (dev server)**

`npm run dev` → click between two authed routes; confirm a short slide+fade transition, and that toggling prefers-reduced-motion in DevTools collapses it to a fade.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat(immersive-redesign): add push/pop page transitions on router-view"
```

---

## Phase 1 — Shell (`AppLayout.vue`)

> `AppLayout.vue` currently has: sticky glass header (brand + 10 pill nav + bell + Allo mark), `<main>` slot, mobile bottom tab bar (5 emoji + More), and a `LiBottomSheet` "More". Phase 1 makes it immersive without changing destinations or breaking `data-testid="bottom-nav-more"`.

### Task 12: Ambient mesh header + scroll-aware depth

**Files:**
- Modify: `src/layouts/AppLayout.vue`

- [ ] **Step 1: Add an ambient gradient layer + scroll-reactive depth to the header**

The full-screen fixed `LiMeshBackground` is wrong inside a sticky header (it'd cover the viewport, not the bar). Use a scoped `::before` brand-radial wash instead — reserved `LiMeshBackground` stays for `LiHero`/login (Phase 2).

In `src/layouts/AppLayout.vue`:

(a) Track scroll in `<script setup>` — extend the existing `import { ref } from 'vue'` to:

```js
import { ref, onMounted, onUnmounted } from 'vue'
```

and after `const showMore = ref(false)`:

```js
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > 8 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
```

(b) Bind the scrolled class on the header — change `<header class="app-header">` to:

```vue
    <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
```

(c) Add the ambient + depth CSS (inside the existing `<style scoped>`). `isolation: isolate` makes the header a stacking context so the `::before` at `z-index: -1` sits behind the header's content but above its glass background; the header keeps `position: sticky`:

```css
.app-header { isolation: isolate; }
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
```

- [ ] **Step 2: Verify**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Manual verify**

`npm run dev` → header shows a subtle warm mesh; opacity/shadow deepens after scrolling 8px; brand mark gently floats.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/AppLayout.vue
git commit -m "feat(immersive-redesign): ambient mesh header + scroll-aware depth"
```

---

### Task 13: Nav consolidation (primary 5 + More) + `LiIcon` icons + sliding active indicator

Desktop currently shows 10 pills + sign-out in a scrollable row — kaku. Consolidate to 5 primary + a "More" dropdown for the rest, swap to icon-led pills, and add a sliding active indicator. Mobile tab bar icons move from emoji to `LiIcon`. Destinations unchanged. **Preserve `data-testid="bottom-nav-more"`.**

**Files:**
- Modify: `src/layouts/AppLayout.vue`

- [ ] **Step 1: Replace the desktop `<nav v-if="user">` block**

Replace the `<nav v-if="user" class="app-header__nav app-header__nav--pills">…</nav>` (the 10-link block: Feed…Profile + Sign out) with 5 primary icon-pills + a `LiDropdown` "More". `LiDropdown` API (confirmed): `#trigger` slot + default-slot menu body, `align` prop, exposes `close()` via template ref. No `title` prop, no `LiDropdownItem` needed.

```vue
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
```

- [ ] **Step 2: Add nav data, imports, and dropdown-close helpers to `<script setup>`**

Update the design-system import (relative path is `../`, not `../../` — AppLayout lives in `src/layouts/`):

```js
import { LiBottomSheet, LiButton, LiIcon, LiDropdown } from '../design-system/components/index.js'
```

(`LiThemeToggle` / `LiScrollProgress` / `LiCommandPalette` / `useTheme` are added in Task 14 — extend this same import line then.)

Add the nav data and helpers near the existing `showMore` ref:

```js
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
```

- [ ] **Step 3: Replace mobile tab-bar emoji with `LiIcon` (preserve `data-testid="bottom-nav-more"`)**

In the bottom tab bar block, replace each emoji `<span class="bottom-tab-bar__icon" aria-hidden="true">📰</span>` with an icon span wrapping `<LiIcon name="…" size="md" />` — e.g. `<span class="bottom-tab-bar__icon" aria-hidden="true"><LiIcon name="newspaper" size="md" /></span>`. Mapping: Feed=`newspaper`, Meets=`sports_tennis`, Clubs=`groups`, Leaderboard=`leaderboard`, More=`more_horiz` (the More item is the `⋯` button). Keep the `data-testid="bottom-nav-more"` attribute on the More button unchanged.

- [ ] **Step 4: Add the sliding-active-indicator + icon-pill CSS**

Append to `<style scoped>`:

```css
.nav-pill { display: inline-flex; align-items: center; gap: var(--space-xs, 4px); }
.nav-pill__label { font-size: var(--text-xs, 14px); }
.nav-pill.router-link-exact-active,
.nav-pill.router-link-active { /* keep existing active gradient */ }
.bottom-tab-bar__item.router-link-active { color: var(--color-brand, #FFAF03); }
.more-item {
  display: inline-flex; align-items: center; gap: var(--space-s, 8px);
  padding: var(--space-s, 8px) var(--space-m, 12px);
  text-decoration: none; color: inherit; background: none; border: none; cursor: pointer; font: inherit;
}
@media (max-width: 768px) { .nav-pill__label { display: none; } .nav-pill { padding: 10px; } }
```

- [ ] **Step 5: Verify**

Run: `npx vitest run`
Expected: PASS (no `data-testid` removed; `bottom-nav-more` still present).

- [ ] **Step 6: Manual verify (3 widths, both themes)**

`npm run dev` → at 1280px: 5 icon pills + More dropdown; at 768px and 375px: bottom tab bar with crisp icons. Toggle dark mode. Confirm every route still reachable (Feed/Meets/Clubs/Leaderboard/Profile direct; Competitions/Network/Achievements/Challenges/Stats via More).

- [ ] **Step 7: Commit**

```bash
git add src/layouts/AppLayout.vue
git commit -m "feat(immersive-redesign): consolidate nav (5 + More) + LiIcon icons"
```

---

### Task 14: Wire theme toggle, scroll progress, command palette, transitions active

**Files:**
- Modify: `src/layouts/AppLayout.vue`

- [ ] **Step 1: Mount the new foundation pieces in the shell**

(a) Extend the design-system import (same `../` path) to include everything wired in this task:

```js
import { LiBottomSheet, LiButton, LiIcon, LiDropdown, LiThemeToggle, LiScrollProgress, LiCommandPalette, useTheme } from '../design-system/components/index.js'
```

(b) Put `<LiScrollProgress />` as the first child inside `<div class="app-shell">`, and `<LiThemeToggle class="app-header__theme" />` next to `<NotificationsBell>` in the header.

(c) Mount `LiCommandPalette`. Its API (confirmed): `v-model` controls open state, `commands` is a grouped array `[ { label, items: [ { id, label, shortcut? } ] } ]`, it self-handles Ctrl/Cmd+K on mount, and emits `@execute(command)`. Command icons must be components (not names), so omit `icon`. Add to `<script setup>`:

```js
import { useRouter } from 'vue-router'
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
```

And in the template, inside `.app-shell` (it teleports to `<body>` so placement is flexible):

```vue
    <LiCommandPalette v-model="paletteOpen" :commands="commands" @execute="onCommand" />
```

- [ ] **Step 2: Verify**

Run: `npm run build && npx vitest run`
Expected: build clean; tests PASS.

- [ ] **Step 3: Manual verify**

`npm run dev` → theme toggle works + persists across reload; scroll progress bar fills; Ctrl/Cmd+K opens the palette; page transitions slide between routes (from Task 11).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/AppLayout.vue
git commit -m "feat(immersive-redesign): wire theme toggle, scroll progress, command palette"
```

---

### Task 15: Full-suite green + dual-mode visual QA gate

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all PASS. If any view spec breaks, a `data-testid` was shifted — restore it.

- [ ] **Step 2: Dual-mode + responsive visual pass**

`npm run dev`. For one representative authed route (e.g. `/meets`) and the landing (`/`), confirm at **375 / 768 / 1280px** in **both light and dark**:
- header mesh + scroll depth + floating brand
- nav consolidation (5 + More) reachable
- theme toggle works + persists
- scroll progress bar
- page transitions on navigation
- reduced-motion (DevTools) collapses motion to instant/fade

- [ ] **Step 3: Wow Test check (spec §8)**

Screenshot the shell in dark mode — does it read as "just another app"? If yes, add depth/motion before proceeding. The shell now has: mesh, glass, float, glow active pill, scroll progress, transitions, spotlight-ready hero component available for Phase 2.

- [ ] **Step 4: Commit any QA fixes, then mark phase done**

```bash
git status   # if fixes were needed, commit them with feat(immersive-redesign): QA …
```

Phase 0 + 1 complete. **Gate:** user reviews the immersive shell + the foundation kit before Phase 2 (flagship views) begins.

---

## Out of scope for this plan (later phases)

- Per-view redesigns (Phase 2 flagship: Home/Leaderboard/MatchSession; Phase 3: the rest) — own plan(s).
- VT-API shared-element morphs (deferred enhancement, noted in Task 11).
- Self-hosting Material Symbols for full PWA offline (noted trade-off in Task 2).
- New semantic tokens beyond the additive `.li-textured` (only if a Phase 2+ signature need is unmet).
