# PADEL BROW — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the PADEL BROW project skeleton — Vue 3 + Vite app deployable to GitHub Pages, the full Supabase Postgres schema (with baseline RLS) for all 9 planned phases, the ported Lithium design system, Allo Bank + new PADEL BROW branding, and PWA installability — so every later phase (Identity & Clubs, Meets, Match Engine, …) builds on working infrastructure instead of scaffolding it piecemeal.

**Architecture:** A Vite-built Vue 3 SPA using `vue-router` in hash mode (required for GitHub Pages, which has no server-side rewrites), talking to a Supabase project (Postgres + Auth + Realtime + Storage) via `@supabase/supabase-js` using the public anon key, with Postgres Row Level Security as the real access-control boundary. The Lithium `Li*` component library is vendored into `src/design-system/` and consumed throughout. Deploys via GitHub Actions on push to `main`.

**Tech Stack:** Vue 3 (`<script setup>`), Vite, vue-router 4, @supabase/supabase-js, vite-plugin-pwa, Vitest + @vue/test-utils, Supabase CLI (local dev via Docker).

## Global Constraints

- Vue 3 Composition API with `<script setup>` for every component (per spec §2).
- Vue Router in **hash mode** (`createWebHashHistory`) — GitHub Pages cannot do server-side rewrites (spec §2).
- Supabase is the only backend; the anon key is public, so **every table has RLS enabled** and policies are the real security boundary (spec §2, §3).
- SQL "enums" are implemented as `text` columns with `check` constraints, not Postgres `enum` types — simpler to alter in later phases without `ALTER TYPE` migrations.
- Local Supabase dev uses the Supabase CLI's fixed local connection string: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Requires Docker Desktop running.
- Design system: consume `../Design Guide/components` + `../Design Guide/composables` + `../Design Guide/tokens.css` verbatim into `src/design-system/` — do **not** port `components/figma-exports/` (per `../Design Guide/CLAUDE.md`, these are raw, lower-quality regex-converted assets, not part of the `Li*` library).
- Never hardcode colors/spacing/radius outside of `var(--token-name, <fallback>)` in any new component (per `../Design Guide/DESIGN.md` conventions).
- No push notifications, no payment gateway integration, no native app — all explicitly out of scope (spec §6 Non-Goals).
- The GitHub repo this project is pushed to is expected to be named `padelbroowww` (matching this folder) — `vite.config.js`'s `base` is set to `/padelbroowww/` accordingly. If the actual repo name differs, that one line needs updating.

---

## File Structure

```
padelbroowww/
├── .github/workflows/deploy.yml
├── public/
│   ├── favicon.svg
│   └── icons/icon-192.png, icon-512.png        (generated, not hand-written)
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/index.js
│   ├── views/HomeView.vue, NotFoundView.vue
│   ├── lib/supabase.js
│   ├── layouts/AppLayout.vue
│   ├── assets/logo-allo.png, padel-brow-mark.svg, padel-brow-logo.svg
│   └── design-system/
│       ├── components/*.vue, index.js, useLiTheme.js   (vendored, unmodified)
│       ├── composables/useRipple.js, useToast.js       (vendored, unmodified)
│       └── tokens.css                                   (vendored, unmodified)
├── scripts/generate-icons.mjs
├── supabase/migrations/*.sql                             (10 files, one per domain)
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

### Task 1: Project scaffold & first build

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `.gitignore`

**Interfaces:**
- Produces: a working `npm run build` producing `dist/index.html`, which every later task's build/test steps depend on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "padel-brow",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "vue": "^3.4.0",
    "vue-router": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "@vue/test-utils": "^2.4.0",
    "jsdom": "^24.1.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
dist-ssr/
*.local
```

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/padelbroowww/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="%BASE_URL%favicon.svg" type="image/svg+xml" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PADEL BROW</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/App.vue`**

```vue
<template>
  <div id="app-root">PADEL BROW</div>
</template>

<script setup></script>
```

- [ ] **Step 6: Create `src/main.js`**

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: exits 0, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 8: Verify the production build works**

Run: `npm run build`
Expected: exits 0, prints a `dist/index.html ... dist/assets/*.js` summary. Confirm with `ls dist/index.html` (file exists).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.js src/App.vue .gitignore
git commit -m "Scaffold Vite + Vue 3 project"
```

---

### Task 2: Test tooling (Vitest) + first smoke test

**Files:**
- Modify: `package.json` (add devDependencies)
- Create: `src/App.spec.js`

**Interfaces:**
- Produces: `npm test` runs Vitest in run-mode; every later task's "smoke test" steps use this same command.

- [ ] **Step 1: Add test devDependencies**

Run: `npm install --save-dev @vue/test-utils jsdom`
Expected: exits 0, `package.json` devDependencies now include `@vue/test-utils` and `jsdom` (already declared in Task 1's `package.json`, this step just materializes them in `node_modules`/lockfile if Task 1 didn't already — safe to run even if already installed).

- [ ] **Step 2: Write the failing test**

`src/App.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

describe('App', () => {
  it('renders the PADEL BROW root', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('PADEL BROW')
  })
})
```

- [ ] **Step 3: Run it to verify it passes (App.vue already renders this text from Task 1)**

Run: `npm test`
Expected: PASS — 1 test file, 1 test passed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/App.spec.js
git commit -m "Add Vitest tooling and App smoke test"
```

---

### Task 3: Vue Router (hash mode) + Home/NotFound views

**Files:**
- Create: `src/router/index.js`
- Create: `src/views/HomeView.vue`
- Create: `src/views/NotFoundView.vue`
- Create: `src/router/index.spec.js`
- Modify: `src/App.vue`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `export default router` from `src/router/index.js`, routes named `home` (`/`) and `not-found` (`/:pathMatch(.*)*`) — later phases add routes to this same router file.

- [ ] **Step 1: Write the failing test**

`src/router/index.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import router from './index.js'

describe('router', () => {
  it('resolves the home route', async () => {
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('resolves unknown paths to not-found', async () => {
    await router.push('/some/unknown/path')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/router/index.js` does not exist yet.

- [ ] **Step 3: Create the views**

`src/views/HomeView.vue`:
```vue
<template>
  <section class="home-view">
    <h1>Welcome to PADEL BROW</h1>
  </section>
</template>

<script setup></script>
```

`src/views/NotFoundView.vue`:
```vue
<template>
  <section class="not-found-view">
    <h1>Page not found</h1>
    <router-link to="/">Back to home</router-link>
  </section>
</template>

<script setup></script>
```

- [ ] **Step 4: Create the router**

`src/router/index.js`:
```js
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
  ]
})

export default router
```

- [ ] **Step 5: Wire the router into the app**

`src/main.js`:
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

`src/App.vue`:
```vue
<template>
  <router-view />
</template>

<script setup></script>
```

- [ ] **Step 6: Update the now-stale App smoke test**

`src/App.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import App from './App.vue'

describe('App', () => {
  it('renders the home view through the router', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', name: 'home', component: HomeView }]
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Welcome to PADEL BROW')
  })
})
```

- [ ] **Step 7: Run tests to verify everything passes**

Run: `npm test`
Expected: PASS — 3 tests across 2 files.

- [ ] **Step 8: Commit**

```bash
git add src/router src/views src/App.vue src/App.spec.js src/main.js
git commit -m "Add hash-mode Vue Router with Home and NotFound views"
```

---

### Task 4: Supabase client wrapper

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/lib/supabase.spec.js`
- Create: `.env.example`

**Interfaces:**
- Consumes: `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Produces: `export const supabase` — a `@supabase/supabase-js` client — every later phase's `use*` composables import this.

- [ ] **Step 1: Install the Supabase client**

Run: `npm install @supabase/supabase-js`
Expected: exits 0 (already declared in Task 1's `package.json`; this materializes it).

- [ ] **Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

- [ ] **Step 3: Write the failing test**

`src/lib/supabase.spec.js`:
```js
import { describe, it, expect, afterEach, vi } from 'vitest'

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws a clear error when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await expect(import('./supabase.js')).rejects.toThrow(/Missing VITE_SUPABASE_URL/)
  })

  it('creates a client when env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
    const { supabase } = await import('./supabase.js')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/lib/supabase.js` does not exist.

- [ ] **Step 5: Implement the client**

`src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib .env.example package.json package-lock.json
git commit -m "Add Supabase client wrapper with env validation"
```

---

### Task 5: Port the Lithium design system

**Files:**
- Create: `src/design-system/components/*.vue` (51 files, vendored)
- Create: `src/design-system/components/index.js` (vendored)
- Create: `src/design-system/components/useLiTheme.js` (vendored)
- Create: `src/design-system/composables/useRipple.js`, `useToast.js` (vendored)
- Create: `src/design-system/tokens.css` (vendored)
- Create: `src/design-system/smoke.spec.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `import { LiButton, LiCard, ... } from '@/design-system/components/index.js'` — every later phase's UI is built from these.

- [ ] **Step 1: Copy the component library, composables, and tokens verbatim (excluding `figma-exports/`)**

Run:
```bash
mkdir -p src/design-system/components src/design-system/composables
cp "C:/Users/22002420/Desktop/Allo/VIBE/Design Guide/components/"*.vue src/design-system/components/
cp "C:/Users/22002420/Desktop/Allo/VIBE/Design Guide/components/index.js" src/design-system/components/
cp "C:/Users/22002420/Desktop/Allo/VIBE/Design Guide/components/useLiTheme.js" src/design-system/components/
cp "C:/Users/22002420/Desktop/Allo/VIBE/Design Guide/composables/"*.js src/design-system/composables/
cp "C:/Users/22002420/Desktop/Allo/VIBE/Design Guide/tokens.css" src/design-system/tokens.css
```
Expected: `ls src/design-system/components/*.vue | wc -l` prints `51`; `ls src/design-system/composables` shows `useRipple.js` and `useToast.js`; no `figma-exports` directory exists under `src/design-system/`.

- [ ] **Step 2: Write the failing smoke test**

`src/design-system/smoke.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { LiButton } from './components/index.js'

describe('design system smoke test', () => {
  it('renders LiButton with default slot content and primary styling', () => {
    const wrapper = mount(LiButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toContain('Click me')
    expect(wrapper.classes()).toContain('li-btn-primary')
  })
})
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `npm test`
Expected: FAIL if the copy in Step 1 wasn't done yet — run this step's test only after Step 1, so in practice this should already pass. If it fails with an import error, re-check Step 1's copy paths.

- [ ] **Step 3: Import tokens.css globally**

`src/main.js`:
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './design-system/tokens.css'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — smoke test renders `LiButton` correctly, confirming the relative `../composables/useRipple` import inside `LiButton.vue` resolves against the copied `composables/` sibling directory.

- [ ] **Step 5: Verify the production build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/design-system src/main.js
git commit -m "Vendor the Lithium design system (components, composables, tokens)"
```

---

### Task 6: App shell (AppLayout)

**Files:**
- Create: `src/layouts/AppLayout.vue`
- Create: `src/layouts/AppLayout.spec.js`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: default slot for page content (the router-view).
- Produces: `AppLayout.vue` component wrapping every route — later phases add nav items inside this shell.

- [ ] **Step 1: Write the failing test**

`src/layouts/AppLayout.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from './AppLayout.vue'

describe('AppLayout', () => {
  it('renders the app title and passed-through slot content', () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' }
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.html()).toContain('page content')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `AppLayout.vue` does not exist.

- [ ] **Step 3: Implement the layout**

`src/layouts/AppLayout.vue`:
```vue
<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="app-header__title">PADEL BROW</span>
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

.app-header__title {
  font-weight: 800;
  font-size: var(--text-md, 18px);
  color: var(--color-gray-900, #333333);
}

.app-main {
  flex: 1;
  padding: var(--space-l, 24px);
}
</style>
```

- [ ] **Step 4: Wire it into `App.vue`**

`src/App.vue`:
```vue
<template>
  <AppLayout>
    <router-view />
  </AppLayout>
</template>

<script setup>
import AppLayout from './layouts/AppLayout.vue'
</script>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. Note: `src/App.spec.js` from Task 3 still passes since it checks for `wrapper.text()).toContain('Welcome to PADEL BROW')`, and `AppLayout`'s slot renders `HomeView` unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/layouts src/App.vue
git commit -m "Add AppLayout shell and wire it into App.vue"
```

---

### Task 7: Branding — Allo Bank logo + new PADEL BROW logo

**Files:**
- Create: `src/assets/logo-allo.png` (copied)
- Create: `src/assets/padel-brow-mark.svg` (new)
- Create: `src/assets/padel-brow-logo.svg` (new)
- Create: `public/favicon.svg` (copy of the mark)
- Modify: `src/layouts/AppLayout.vue`
- Modify: `src/layouts/AppLayout.spec.js`

**Interfaces:**
- Produces: `src/assets/padel-brow-mark.svg` (icon-only badge, used again in Task 8 for PWA icon generation) and `src/assets/padel-brow-logo.svg` (icon + wordmark lockup).

- [ ] **Step 1: Copy the Allo Bank logo into the project**

Run:
```bash
mkdir -p src/assets
cp "C:/Users/22002420/Desktop/Pic/logo-allo.png" src/assets/logo-allo.png
```
Expected: `ls src/assets/logo-allo.png` shows the file.

- [ ] **Step 2: Create the PADEL BROW icon mark**

`src/assets/padel-brow-mark.svg`:
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FFAF03"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#pbGrad)" stroke="#333333" stroke-width="3"/>
  <ellipse cx="52" cy="46" rx="22" ry="26" fill="none" stroke="#333333" stroke-width="4"/>
  <g stroke="#333333" stroke-width="1.6" opacity="0.55">
    <line x1="38" y1="30" x2="38" y2="62"/>
    <line x1="46" y1="24" x2="46" y2="68"/>
    <line x1="54" y1="22" x2="54" y2="70"/>
    <line x1="62" y1="24" x2="62" y2="68"/>
    <line x1="70" y1="30" x2="70" y2="62"/>
    <line x1="32" y1="46" x2="72" y2="46"/>
    <line x1="34" y1="38" x2="70" y2="38"/>
    <line x1="34" y1="54" x2="70" y2="54"/>
  </g>
  <rect x="47" y="68" width="10" height="26" rx="5" fill="#333333"/>
  <circle cx="82" cy="78" r="14" fill="#F5F0E6" stroke="#333333" stroke-width="3"/>
  <path d="M72 72 Q82 78 72 84" fill="none" stroke="#333333" stroke-width="1.6"/>
  <path d="M92 72 Q82 78 92 84" fill="none" stroke="#333333" stroke-width="1.6"/>
</svg>
```

- [ ] **Step 3: Create the PADEL BROW wordmark lockup**

`src/assets/padel-brow-logo.svg`:
```svg
<svg viewBox="0 0 360 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pbGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FFAF03"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#pbGrad2)" stroke="#333333" stroke-width="2.5"/>
  <ellipse cx="44" cy="40" rx="17" ry="20" fill="none" stroke="#333333" stroke-width="3"/>
  <g stroke="#333333" stroke-width="1.2" opacity="0.55">
    <line x1="33" y1="27" x2="33" y2="53"/>
    <line x1="39" y1="22" x2="39" y2="58"/>
    <line x1="45" y1="20" x2="45" y2="60"/>
    <line x1="51" y1="22" x2="51" y2="58"/>
    <line x1="57" y1="27" x2="57" y2="53"/>
    <line x1="28" y1="40" x2="60" y2="40"/>
    <line x1="30" y1="33" x2="58" y2="33"/>
    <line x1="30" y1="47" x2="58" y2="47"/>
  </g>
  <rect x="40" y="56" width="8" height="20" rx="4" fill="#333333"/>
  <circle cx="68" cy="64" r="11" fill="#F5F0E6" stroke="#333333" stroke-width="2.5"/>
  <text x="112" y="46" font-family="Inter, sans-serif" font-weight="800" font-size="30" fill="#333333">PADEL</text>
  <text x="112" y="80" font-family="Inter, sans-serif" font-weight="800" font-size="30" fill="#FFAF03">BROW</text>
</svg>
```

- [ ] **Step 4: Copy the mark as the favicon**

Run:
```bash
mkdir -p public
cp src/assets/padel-brow-mark.svg public/favicon.svg
```

- [ ] **Step 5: Update the failing test first**

`src/layouts/AppLayout.spec.js`:
```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from './AppLayout.vue'

describe('AppLayout', () => {
  it('renders the PADEL BROW mark, Allo Bank logo, title, and slot content', () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p>page content</p>' }
    })
    expect(wrapper.text()).toContain('PADEL BROW')
    expect(wrapper.find('img.app-header__mark').exists()).toBe(true)
    expect(wrapper.find('img.app-header__allo').exists()).toBe(true)
    expect(wrapper.html()).toContain('page content')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `AppLayout.vue` doesn't render `img.app-header__mark`/`img.app-header__allo` yet.

- [ ] **Step 7: Wire the logos into `AppLayout.vue`**

`src/layouts/AppLayout.vue`:
```vue
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
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Verify the build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
git add src/assets src/layouts public/favicon.svg
git commit -m "Add Allo Bank and PADEL BROW branding to the app shell"
```

---

### Task 8: PWA manifest & installability

**Files:**
- Modify: `package.json` (add `vite-plugin-pwa`, `sharp`)
- Modify: `vite.config.js`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (generated)

**Interfaces:**
- Produces: a `dist/manifest.webmanifest` and service worker in the production build; `public/icons/*.png` consumed by that manifest.

- [ ] **Step 1: Install dependencies**

Run: `npm install --save-dev vite-plugin-pwa sharp`
Expected: exits 0.

- [ ] **Step 2: Write the icon-generation script**

`scripts/generate-icons.mjs`:
```js
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const svg = readFileSync(`${projectRoot}/src/assets/padel-brow-mark.svg`)
mkdirSync(`${projectRoot}/public/icons`, { recursive: true })

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`${projectRoot}/public/icons/icon-${size}.png`)
  console.log(`Generated public/icons/icon-${size}.png`)
}
```

- [ ] **Step 3: Run the script to generate the icons**

Run: `node scripts/generate-icons.mjs`
Expected: prints `Generated public/icons/icon-192.png` and `Generated public/icons/icon-512.png`. Confirm with `ls public/icons/` showing both files.

- [ ] **Step 4: Add the PWA plugin to `vite.config.js`**

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/padelbroowww/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PADEL BROW',
        short_name: 'PADEL BROW',
        description: 'Organize padel meets, matches, and competitions with your club.',
        theme_color: '#FFAF03',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/padelbroowww/#/',
        scope: '/padelbroowww/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 5: Verify the build produces PWA assets**

Run: `npm run build`
Expected: exits 0. Confirm with `ls dist/manifest.webmanifest dist/sw.js` — both files exist.

- [ ] **Step 6: Verify existing tests still pass**

Run: `npm test`
Expected: PASS (PWA plugin only affects the build step, not the Vitest test run).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js scripts public/icons
git commit -m "Add PWA manifest and installability via vite-plugin-pwa"
```

---

### Task 9: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: on push to `main`, builds the app and deploys `dist/` to GitHub Pages via the official Pages Actions.

- [ ] **Step 1: Create the workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate the YAML is well-formed**

Run: `npx js-yaml .github/workflows/deploy.yml`
Expected: prints the parsed YAML structure back out with no error (a YAML syntax error would instead print `YAMLException` and a non-zero exit code).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow to build and deploy to GitHub Pages"
```

**Note for whoever pushes this repo to GitHub:** in the repo's Settings → Pages, set the source to "GitHub Actions". In Settings → Secrets and variables → Actions, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from the Supabase project created in Task 10) so the deploy build has real credentials — without them `npm run build` will fail at the `src/lib/supabase.js` env check.

---

### Task 10: Supabase local setup + Migration 0001 (Identity)

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/<timestamp>_identity.sql`

**Interfaces:**
- Produces: `public.profiles` (RLS: authenticated SELECT all, INSERT/UPDATE own row only) and `public.blocks` (RLS: owner-only), plus an `auth.users` → `public.profiles` creation trigger. Every later migration references `public.profiles(id)`.

- [ ] **Step 1: Install the Supabase CLI and confirm Docker is running**

Run: `npx supabase --version`
Expected: prints a version number (npx downloads the CLI on first run if not already installed globally).

Run: `docker info`
Expected: prints Docker daemon info (not an error) — Docker Desktop must be running before `supabase start` in Step 3.

- [ ] **Step 2: Initialize the Supabase project**

Run: `npx supabase init`
Expected: creates `supabase/config.toml` and an empty `supabase/migrations/` directory. Confirm with `ls supabase/config.toml`.

- [ ] **Step 3: Start the local Supabase stack**

Run: `npx supabase start`
Expected: pulls/starts Docker containers and prints a table including `API URL`, `anon key`, and `service_role key`. This will take a few minutes on first run. Keep this output — the anon key and API URL go into your local `.env` for later manual testing.

- [ ] **Step 4: Create the migration file**

Run: `npx supabase migration new identity`
Expected: creates `supabase/migrations/<timestamp>_identity.sql` (an empty file) — note the exact generated filename for the next step.

- [ ] **Step 5: Write the migration**

Open the file created in Step 4 and write:

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  gender text check (gender in ('male', 'female', 'unspecified')) default 'unspecified',
  birthdate date,
  skill_level numeric,
  home_area text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_select_own" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

create policy "blocks_insert_own" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

create policy "blocks_delete_own" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());
```

- [ ] **Step 6: Apply the migration and verify**

Run: `npx supabase db reset`
Expected: exits 0, log ends with `Finished supabase db reset`.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('profiles','blocks') order by relname;"
```
Expected:
```
 relname  | relrowsecurity
----------+----------------
 blocks   | t
 profiles | t
```

- [ ] **Step 7: Commit**

```bash
git add supabase
git commit -m "Add Supabase project config and identity schema migration"
```

---

### Task 11: Migration 0002 (Clubs)

**Files:**
- Create: `supabase/migrations/<timestamp>_clubs.sql`

**Interfaces:**
- Consumes: `public.profiles(id)` from Task 10.
- Produces: `public.clubs`, `public.club_members`, `public.club_memberships`, `public.club_membership_subscriptions` (the latter's `payment_id` column is a plain `uuid` for now — the FK to `public.payments` is added in Task 15 once that table exists).

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new clubs`
Expected: creates `supabase/migrations/<timestamp>_clubs.sql`.

- [ ] **Step 2: Write the migration**

```sql
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text,
  description text,
  visibility text not null check (visibility in ('public','private')) default 'public',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy "clubs_select_authenticated" on public.clubs
  for select to authenticated using (true);

create policy "clubs_insert_own" on public.clubs
  for insert to authenticated with check (owner_id = auth.uid());

create policy "clubs_update_owner" on public.clubs
  for update to authenticated using (owner_id = auth.uid());

create policy "clubs_delete_owner" on public.clubs
  for delete to authenticated using (owner_id = auth.uid());

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','organizer','member')) default 'member',
  tags text[] not null default '{}',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.club_members enable row level security;

create policy "club_members_select_authenticated" on public.club_members
  for select to authenticated using (true);

create policy "club_members_insert_own" on public.club_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "club_members_delete_own_or_owner" on public.club_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id and c.owner_id = auth.uid()
    )
  );

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  period text not null check (period in ('monthly','quarterly','annual')),
  perks jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.club_memberships enable row level security;

create policy "club_memberships_select_authenticated" on public.club_memberships
  for select to authenticated using (true);

create policy "club_memberships_manage_owner_organizer" on public.club_memberships
  for all to authenticated using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_memberships.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_memberships.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  );

create table public.club_membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('active','expired','cancelled')) default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_id uuid
);

alter table public.club_membership_subscriptions enable row level security;

create policy "club_membership_subscriptions_select_own" on public.club_membership_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy "club_membership_subscriptions_insert_own" on public.club_membership_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('clubs','club_members','club_memberships','club_membership_subscriptions') order by relname;"
```
Expected: all four rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add clubs schema migration"
```

---

### Task 12: Migration 0003 (Meets)

**Files:**
- Create: `supabase/migrations/<timestamp>_meets.sql`

**Interfaces:**
- Consumes: `public.profiles(id)`, `public.clubs(id)`.
- Produces: `public.meets` (with `public_share_slug` for Phase 3's shareable-link feature and `mvp_user_id` for Phase 9's MVP feature), `public.meet_participants` (with `invited_by` for invite tracking), `public.meet_polls`, `public.meet_poll_votes`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new meets`

- [ ] **Step 2: Write the migration**

```sql
create table public.meets (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('padel','billiards','football')) default 'padel',
  format text not null check (format in ('social','americano','mexicano')) default 'social',
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  max_players integer not null default 4,
  privacy text not null check (privacy in ('public','private')) default 'public',
  fee_amount numeric not null default 0,
  fee_currency text not null default 'IDR',
  min_level numeric,
  max_level numeric,
  gender_restriction text,
  age_restriction text,
  repeat_rule text,
  host_role text not null check (host_role in ('host_and_play','host_only')) default 'host_and_play',
  cancellation_freeze_hours integer not null default 0,
  auto_approve boolean not null default false,
  allow_plus_one boolean not null default true,
  notes text,
  status text not null check (status in ('scheduled','completed','cancelled')) default 'scheduled',
  public_share_slug text unique,
  mvp_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.meets enable row level security;

create policy "meets_select_authenticated" on public.meets
  for select to authenticated using (true);

create policy "meets_insert_own" on public.meets
  for insert to authenticated with check (creator_id = auth.uid());

create policy "meets_update_creator" on public.meets
  for update to authenticated using (creator_id = auth.uid());

create policy "meets_delete_creator" on public.meets
  for delete to authenticated using (creator_id = auth.uid());

create table public.meet_participants (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer','player')) default 'player',
  status text not null check (status in ('confirmed','waitlisted','invited','declined')) default 'invited',
  invited_by uuid references public.profiles(id),
  is_plus_one boolean not null default false,
  joined_at timestamptz not null default now(),
  payment_status text not null check (payment_status in ('none','pending','proof_uploaded','confirmed')) default 'none',
  unique (meet_id, user_id)
);

alter table public.meet_participants enable row level security;

create policy "meet_participants_select_authenticated" on public.meet_participants
  for select to authenticated using (true);

create policy "meet_participants_insert_self_or_organizer" on public.meet_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create policy "meet_participants_update_self_or_organizer" on public.meet_participants
  for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create policy "meet_participants_delete_self_or_organizer" on public.meet_participants
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create table public.meet_polls (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  question text not null,
  type text not null check (type in ('mvp_vote','best_moment','custom')) default 'custom',
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.meet_polls enable row level security;

create policy "meet_polls_select_authenticated" on public.meet_polls
  for select to authenticated using (true);

create policy "meet_polls_manage_organizer" on public.meet_polls
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = meet_polls.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = meet_polls.meet_id and m.creator_id = auth.uid())
  );

create table public.meet_poll_votes (
  poll_id uuid not null references public.meet_polls(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  choice_user_id uuid references public.profiles(id),
  choice_text text,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

alter table public.meet_poll_votes enable row level security;

create policy "meet_poll_votes_select_authenticated" on public.meet_poll_votes
  for select to authenticated using (true);

create policy "meet_poll_votes_insert_own" on public.meet_poll_votes
  for insert to authenticated with check (voter_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('meets','meet_participants','meet_polls','meet_poll_votes') order by relname;"
```
Expected: all four rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add meets schema migration"
```

---

### Task 13: Migration 0004 (Match Engine)

**Files:**
- Create: `supabase/migrations/<timestamp>_match_engine.sql`

**Interfaces:**
- Consumes: `public.meets(id, creator_id)`, `public.profiles(id)`.
- Produces: `public.match_sessions`, `public.match_rounds`, `public.matches`, `public.match_players`, `public.player_ratings` (with `reliability_pct` for the reliability-score feature).

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new match_engine`

- [ ] **Step 2: Write the migration**

```sql
create table public.match_sessions (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  format text not null check (format in ('americano','mexicano','team_americano','singles')),
  ranking_criteria text not null check (ranking_criteria in ('matches_won','points_won','win_pct','points_pct')) default 'matches_won',
  num_courts integer not null default 1,
  total_set_points integer not null default 21,
  prioritize_least_matches boolean not null default true,
  status text not null check (status in ('setup','in_progress','completed')) default 'setup',
  created_at timestamptz not null default now()
);

alter table public.match_sessions enable row level security;

create policy "match_sessions_select_authenticated" on public.match_sessions
  for select to authenticated using (true);

create policy "match_sessions_manage_organizer" on public.match_sessions
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = match_sessions.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = match_sessions.meet_id and m.creator_id = auth.uid())
  );

create table public.match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_session_id uuid not null references public.match_sessions(id) on delete cascade,
  round_number integer not null,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.match_rounds enable row level security;

create policy "match_rounds_select_authenticated" on public.match_rounds
  for select to authenticated using (true);

create policy "match_rounds_manage_organizer" on public.match_rounds
  for all to authenticated using (
    exists (
      select 1 from public.match_sessions ms
      join public.meets m on m.id = ms.meet_id
      where ms.id = match_rounds.match_session_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.match_sessions ms
      join public.meets m on m.id = ms.meet_id
      where ms.id = match_rounds.match_session_id and m.creator_id = auth.uid()
    )
  );

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_round_id uuid not null references public.match_rounds(id) on delete cascade,
  court_number integer not null default 1,
  score_a integer,
  score_b integer,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.matches enable row level security;

create policy "matches_select_authenticated" on public.matches
  for select to authenticated using (true);

create policy "matches_manage_organizer" on public.matches
  for all to authenticated using (
    exists (
      select 1 from public.match_rounds mr
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where mr.id = matches.match_round_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.match_rounds mr
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where mr.id = matches.match_round_id and m.creator_id = auth.uid()
    )
  );

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('a','b')),
  primary key (match_id, user_id)
);

alter table public.match_players enable row level security;

create policy "match_players_select_authenticated" on public.match_players
  for select to authenticated using (true);

create policy "match_players_manage_organizer" on public.match_players
  for all to authenticated using (
    exists (
      select 1 from public.matches ma
      join public.match_rounds mr on mr.id = ma.match_round_id
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where ma.id = match_players.match_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.matches ma
      join public.match_rounds mr on mr.id = ma.match_round_id
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where ma.id = match_players.match_id and m.creator_id = auth.uid()
    )
  );

create table public.player_ratings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rating numeric not null default 3.0,
  matches_played integer not null default 0,
  reliability_pct numeric not null default 0,
  last_updated timestamptz not null default now()
);

alter table public.player_ratings enable row level security;

create policy "player_ratings_select_authenticated" on public.player_ratings
  for select to authenticated using (true);

create policy "player_ratings_insert_own" on public.player_ratings
  for insert to authenticated with check (user_id = auth.uid());

create policy "player_ratings_update_own" on public.player_ratings
  for update to authenticated using (user_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('match_sessions','match_rounds','matches','match_players','player_ratings') order by relname;"
```
Expected: all five rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add match engine schema migration"
```

---

### Task 14: Migration 0005 (Competitions)

**Files:**
- Create: `supabase/migrations/<timestamp>_competitions.sql`

**Interfaces:**
- Consumes: `public.clubs(id)`, `public.club_members(club_id, user_id, role)`.
- Produces: `public.competitions` (with `public_share_slug`), `public.competition_teams`, `public.competition_registrations`, `public.competition_matches`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new competitions`

- [ ] **Step 2: Write the migration**

```sql
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('padel','billiards','football')) default 'padel',
  format text not null check (format in ('single_elim','double_elim','round_robin','groups')),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer,
  fee_amount numeric not null default 0,
  status text not null check (status in ('draft','registration_open','in_progress','completed')) default 'draft',
  public_share_slug text unique,
  created_at timestamptz not null default now()
);

alter table public.competitions enable row level security;

create policy "competitions_select_authenticated" on public.competitions
  for select to authenticated using (true);

create policy "competitions_manage_owner_organizer" on public.competitions
  for all to authenticated using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = competitions.club_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = competitions.club_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  player_ids uuid[] not null default '{}'
);

alter table public.competition_teams enable row level security;

create policy "competition_teams_select_authenticated" on public.competition_teams
  for select to authenticated using (true);

create policy "competition_teams_manage_organizer" on public.competition_teams
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_teams.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_teams.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_registrations (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  seed integer,
  status text not null check (status in ('pending','confirmed')) default 'pending',
  primary key (competition_id, team_id)
);

alter table public.competition_registrations enable row level security;

create policy "competition_registrations_select_authenticated" on public.competition_registrations
  for select to authenticated using (true);

create policy "competition_registrations_manage_organizer" on public.competition_registrations
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_registrations.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_registrations.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_name text not null,
  bracket_position integer not null default 0,
  team_a_id uuid references public.competition_teams(id),
  team_b_id uuid references public.competition_teams(id),
  score_a integer,
  score_b integer,
  court text,
  scheduled_at timestamptz,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.competition_matches enable row level security;

create policy "competition_matches_select_authenticated" on public.competition_matches
  for select to authenticated using (true);

create policy "competition_matches_manage_organizer" on public.competition_matches
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_matches.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_matches.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('competitions','competition_teams','competition_registrations','competition_matches') order by relname;"
```
Expected: all four rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add competitions schema migration"
```

---

### Task 15: Migration 0006 (Payments)

**Files:**
- Create: `supabase/migrations/<timestamp>_payments.sql`

**Interfaces:**
- Consumes: `public.meets(id, creator_id)`, `public.competitions(id)`, `public.club_membership_subscriptions(id)`, `public.profiles(id)`.
- Produces: `public.meet_expenses`, `public.meet_expense_shares`, `public.payments`; adds the deferred FK from `club_membership_subscriptions.payment_id` to `payments.id`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new payments`

- [ ] **Step 2: Write the migration**

```sql
create table public.meet_expenses (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  label text not null,
  total_amount numeric not null,
  split_method text not null check (split_method in ('equal','custom')) default 'equal',
  created_at timestamptz not null default now()
);

alter table public.meet_expenses enable row level security;

create policy "meet_expenses_select_authenticated" on public.meet_expenses
  for select to authenticated using (true);

create policy "meet_expenses_manage_organizer" on public.meet_expenses
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = meet_expenses.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = meet_expenses.meet_id and m.creator_id = auth.uid())
  );

create table public.meet_expense_shares (
  id uuid primary key default gen_random_uuid(),
  meet_expense_id uuid not null references public.meet_expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_owed numeric not null,
  unique (meet_expense_id, user_id)
);

alter table public.meet_expense_shares enable row level security;

create policy "meet_expense_shares_select_authenticated" on public.meet_expense_shares
  for select to authenticated using (true);

create policy "meet_expense_shares_manage_organizer" on public.meet_expense_shares
  for all to authenticated using (
    exists (
      select 1 from public.meet_expenses me
      join public.meets m on m.id = me.meet_id
      where me.id = meet_expense_shares.meet_expense_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.meet_expenses me
      join public.meets m on m.id = me.meet_id
      where me.id = meet_expense_shares.meet_expense_id and m.creator_id = auth.uid()
    )
  );

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid references public.meets(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  membership_subscription_id uuid references public.club_membership_subscriptions(id) on delete cascade,
  expense_share_id uuid references public.meet_expense_shares(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  proof_url text,
  status text not null check (status in ('pending','confirmed','rejected')) default 'pending',
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select_own_or_organizer" on public.payments
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
    or exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = payments.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create policy "payments_insert_own" on public.payments
  for insert to authenticated with check (user_id = auth.uid());

create policy "payments_update_own_or_organizer" on public.payments
  for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
  );

alter table public.club_membership_subscriptions
  add constraint club_membership_subscriptions_payment_fk
  foreign key (payment_id) references public.payments(id) on delete set null;
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('meet_expenses','meet_expense_shares','payments') order by relname;"
```
Expected: all three rows with `relrowsecurity = t`.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select conname from pg_constraint where conname = 'club_membership_subscriptions_payment_fk';"
```
Expected: one row printed, confirming the deferred FK was added.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add payments schema migration and link club membership subscriptions to payments"
```

---

### Task 16: Migration 0007 (Feed & Moderation)

**Files:**
- Create: `supabase/migrations/<timestamp>_feed_and_moderation.sql`

**Interfaces:**
- Consumes: `public.clubs(id)`, `public.meets(id)`, `public.profiles(id)`.
- Produces: `public.feed_posts`, `public.feed_likes`, `public.feed_comments`, `public.reports`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new feed_and_moderation`

- [ ] **Step 2: Write the migration**

```sql
create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  meet_id uuid references public.meets(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.feed_posts enable row level security;

create policy "feed_posts_select_authenticated" on public.feed_posts
  for select to authenticated using (true);

create policy "feed_posts_insert_own" on public.feed_posts
  for insert to authenticated with check (author_id = auth.uid());

create policy "feed_posts_update_own" on public.feed_posts
  for update to authenticated using (author_id = auth.uid());

create policy "feed_posts_delete_own" on public.feed_posts
  for delete to authenticated using (author_id = auth.uid());

create table public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.feed_likes enable row level security;

create policy "feed_likes_select_authenticated" on public.feed_likes
  for select to authenticated using (true);

create policy "feed_likes_insert_own" on public.feed_likes
  for insert to authenticated with check (user_id = auth.uid());

create policy "feed_likes_delete_own" on public.feed_likes
  for delete to authenticated using (user_id = auth.uid());

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.feed_comments enable row level security;

create policy "feed_comments_select_authenticated" on public.feed_comments
  for select to authenticated using (true);

create policy "feed_comments_insert_own" on public.feed_comments
  for insert to authenticated with check (author_id = auth.uid());

create policy "feed_comments_delete_own" on public.feed_comments
  for delete to authenticated using (author_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('feed_post','feed_comment','chat_message','dm_message','user')),
  target_id uuid not null,
  reason text not null,
  status text not null check (status in ('pending','reviewed','actioned')) default 'pending',
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('feed_posts','feed_likes','feed_comments','reports') order by relname;"
```
Expected: all four rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add feed and moderation schema migration"
```

---

### Task 17: Migration 0008 (Notifications & Chat)

**Files:**
- Create: `supabase/migrations/<timestamp>_notifications_and_chat.sql`

**Interfaces:**
- Consumes: `public.meets(id)`, `public.meet_participants(meet_id, user_id)`, `public.blocks`, `public.profiles(id)`.
- Produces: `public.notifications`, `public.chat_messages`, `public.dm_threads`, `public.dm_messages`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new notifications_and_chat`

- [ ] **Step 2: Write the migration**

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.meet_participants mp
      where mp.meet_id = chat_messages.meet_id and mp.user_id = auth.uid()
    )
    or exists (select 1 from public.meets m where m.id = chat_messages.meet_id and m.creator_id = auth.uid())
  );

create policy "chat_messages_insert_participant" on public.chat_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.meet_participants mp
        where mp.meet_id = chat_messages.meet_id and mp.user_id = auth.uid()
      )
      or exists (select 1 from public.meets m where m.id = chat_messages.meet_id and m.creator_id = auth.uid())
    )
  );

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

alter table public.dm_threads enable row level security;

create policy "dm_threads_select_own" on public.dm_threads
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

create policy "dm_threads_insert_own" on public.dm_threads
  for insert to authenticated with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = user_a and b.blocked_id = user_b)
         or (b.blocker_id = user_b and b.blocked_id = user_a)
    )
  );

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.dm_messages enable row level security;

create policy "dm_messages_select_thread_member" on public.dm_messages
  for select to authenticated using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

create policy "dm_messages_insert_thread_member" on public.dm_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('notifications','chat_messages','dm_threads','dm_messages') order by relname;"
```
Expected: all four rows with `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add notifications and chat schema migration"
```

---

### Task 18: Migration 0009 (Social / Follows)

**Files:**
- Create: `supabase/migrations/<timestamp>_social_follows.sql`

**Interfaces:**
- Consumes: `public.profiles(id)`.
- Produces: `public.follows`. (Note: the `public_share_slug` columns for the sharing feature already live on `public.meets` and `public.competitions`, added in Tasks 12 and 14 — there is no separate "sharing" table.)

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new social_follows`

- [ ] **Step 2: Write the migration**

```sql
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "follows_select_authenticated" on public.follows
  for select to authenticated using (true);

create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname = 'follows';"
```
Expected: one row, `relrowsecurity = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add social follows schema migration"
```

---

### Task 19: Migration 0010 (Gamification)

**Files:**
- Create: `supabase/migrations/<timestamp>_gamification.sql`

**Interfaces:**
- Consumes: `public.profiles(id)`.
- Produces: `public.xp_events`, `public.level_thresholds` (seeded with 4 rows), `public.achievements`, `public.player_achievements`, `public.seasons`, `public.challenges`, `public.player_challenge_progress`.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new gamification`

- [ ] **Step 2: Write the migration**

```sql
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('meet_played','meet_won','hosted_meet','competition_played','referral','challenge_completed')),
  amount integer not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "xp_events_select_own" on public.xp_events
  for select to authenticated using (user_id = auth.uid());

create table public.level_thresholds (
  level integer primary key,
  title text not null,
  min_xp integer not null
);

alter table public.level_thresholds enable row level security;

create policy "level_thresholds_select_all" on public.level_thresholds
  for select to authenticated, anon using (true);

insert into public.level_thresholds (level, title, min_xp) values
  (1, 'Rookie', 0),
  (2, 'Amateur', 500),
  (3, 'Pro', 2000),
  (4, 'Legend', 5000);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  tier text not null check (tier in ('bronze','silver','gold','platinum')),
  icon text,
  unlock_criteria jsonb not null default '{}'
);

alter table public.achievements enable row level security;

create policy "achievements_select_all" on public.achievements
  for select to authenticated, anon using (true);

create table public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.player_achievements enable row level security;

create policy "player_achievements_select_authenticated" on public.player_achievements
  for select to authenticated using (true);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

alter table public.seasons enable row level security;

create policy "seasons_select_all" on public.seasons
  for select to authenticated, anon using (true);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  period text not null check (period in ('weekly','monthly')),
  target_criteria jsonb not null default '{}',
  xp_reward integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

alter table public.challenges enable row level security;

create policy "challenges_select_all" on public.challenges
  for select to authenticated, anon using (true);

create table public.player_challenge_progress (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress numeric not null default 0,
  completed_at timestamptz,
  primary key (challenge_id, user_id)
);

alter table public.player_challenge_progress enable row level security;

create policy "player_challenge_progress_select_own" on public.player_challenge_progress
  for select to authenticated using (user_id = auth.uid());

create policy "player_challenge_progress_insert_own" on public.player_challenge_progress
  for insert to authenticated with check (user_id = auth.uid());

create policy "player_challenge_progress_update_own" on public.player_challenge_progress
  for update to authenticated using (user_id = auth.uid());
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db reset`
Expected: exits 0.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relname, relrowsecurity from pg_class where relname in ('xp_events','level_thresholds','achievements','player_achievements','seasons','challenges','player_challenge_progress') order by relname;"
```
Expected: all seven rows with `relrowsecurity = t`.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from public.level_thresholds;"
```
Expected: `4`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "Add gamification schema migration"
```

---

## Self-Review Notes

- **Spec coverage:** every table in the design spec's §3 Data Model (Identity, Clubs, Meets, Match engine, Competitions, Payments, Feed, Notifications, Chat, Stats/derived-only, Skill Rating, Social/Network, Sharing-as-columns, Gamification) has a corresponding migration task (10–19). Architecture requirements from §2 (Vue 3, hash router, Supabase+RLS, Lithium design system, Allo Bank + PADEL BROW branding) each have a dedicated task (1, 3, 5, 6/7). PWA installability (a Phase 1 item per the spec's build-phase list) is Task 8. The GitHub Actions deploy pipeline is Task 9.
- **Deferred FK pattern:** `club_membership_subscriptions.payment_id` is created as a plain `uuid` in Task 11 and only gets its foreign-key constraint in Task 15, since `payments` doesn't exist until then — this is called out explicitly in both tasks so it isn't mistaken for an oversight.
- **Out of scope for this plan (by design):** Identity & Clubs UI, Meets UI, Match Engine UI/algorithms, Payments UI, Competitions UI, Feed UI, Stats/Leaderboard UI, and all Gamification UI/logic are Phase 2–9 work — Phase 1 only creates the schema and baseline RLS they'll sit on, per the spec's phased build-out.
