# Immersive Dual-Mode Redesign — Design Spec

**Date:** 2026-07-15
**Status:** Approved for implementation planning
**Predecessor:** [2026-07-14 UI/UX Consistency Rework](2026-07-14-ui-ux-consistency-rework-design.md)

## 1. Summary

The consistency rework brought every view up to using the `Li*` component library, but
deliberately stayed **surface-only**: no mesh backgrounds, no signature moments, no depth
layering, `LiButton` instead of `LiMagneticButton`, `LiCard` instead of `LiGlassCard`, flat
white `--color-surface` panels, bare text cards. The result reads as **kaku** (rigid, uniform,
boxy) and **traditional** (generic SaaS/dashboard) — the look the [Lithium Design Guide]
(../../Design%20Guide/DESIGN.md) explicitly forbids: *"If it looks like a corporate dashboard or
a Bootstrap theme, it's wrong," "No rigid boxes, no boxy grids."*

This is a **full visual overhaul**: implement the Design Guide **faithfully and fully** across
every page and the shell, in an **immersive · playful · premium** direction, at **dual-mode
parity** (light + dark both polished to the same bar, working toggle). The guide already defines
this aesthetic — it was never actually built.

**Presentation + layout + design-system evolution only.** No business-logic changes: composables,
Supabase calls, RPCs, schema, and event handlers stay untouched. New presentational components and
motion composables are in scope.

### Locked decisions
- **Direction:** immersive + playful + premium.
- **Depth:** full overhaul — visual + per-page layouts + evolve the design system (new components/composables).
- **Canvas:** dual-mode parity (light default + dark, both to full bar, persisted toggle).
- **Mandate:** follow the Design Guide; no slop, must not read as a generic AI-generated website.

## 2. Goals & Non-Goals

**Goals**
- Every screen implements the guide's depth layering, signature moments, ambient motion, and
  organic surfaces — in **both** light and dark.
- A working, persisted dark/light toggle with genuine parity (no theme that only works in one mode).
- Each view gets at least one **signature moment** (guide §1B / §10 Wow Test) and a **varied
  layout** so pages stop reading as the same card-grid template.
- Premium, non-generic identity: noise texture, light streaks, cursor awareness, particle
  celebrations, page transitions, SVG iconography.

**Non-Goals**
- No new features, routes, auth/RLS/schema changes.
- No business-logic changes (see §10).
- No native app wrapper.
- No rewrite of `tokens.css` values (already guide-aligned + dark override exists); only **additive**
  tokens if a signature need cannot be met (flag, don't invent silently).

## 3. Foundation — theme system + signature kit (Phase 0)

Shared dependencies every later phase leans on. Built first. All motion degrades to instant under
`prefers-reduced-motion: reduce` (guide §9) — composables check the media query and no-op.

### 3.1 `useTheme` composable + `LiThemeToggle` component
- **`useTheme`** (`src/design-system/composables/useTheme.js`): singleton state `'light' | 'dark'`.
  - On init: read `localStorage('padelbrow-theme')`; else `matchMedia('(prefers-color-scheme: dark)')`.
  - Setter persists to localStorage and sets `document.documentElement.dataset.theme`.
  - Exposes `theme` (ref), `toggle()`, `set(theme)`, `isDark` (computed).
- **`LiThemeToggle`** (`src/design-system/components/LiThemeToggle.vue`): icon button (sun/moon via
  `LiIcon`), spring rotate on switch, 44×44 tap target, `aria-label` + `aria-pressed`. Wired to `useTheme`.
- Applied in `App.vue` `onMounted` so `data-theme` is set before first paint of authed views.

### 3.2 `LiHero` component
`src/design-system/components/LiHero.vue` — reusable immersive page hero (the guide's "mandatory
mesh on heroes/login" as a single component).
- Props: `variant?: 'warm' | 'cool' | 'success'` (mesh preset), `eyebrow?`, `title` (required),
  `subtitle?`, `tilt?: boolean` (cursor-tracked 3D tilt of the title block, default `true` desktop-only).
- Slots: `actions`, `default` (hero body).
- Renders: `LiMeshBackground` (ambient, drifting) → noise overlay → reveal cascade
  (eyebrow → title → subtitle → actions, guide §5.5) → cursor spotlight (desktop) → optional
  parallax via `LiParallaxSection`.
- Title uses `LiGradientText` at display size (guide §3.3).

### 3.3 Particle system — `LiConfetti`, `LiSparkle`, `useParticles`
- **`useParticles`** (`src/design-system/composables/useParticles.js`): imperative
  `confetti(originEl, opts?)` and `sparkle(targetEl, opts?)`. Renders a transient container, spawns
  N particles per guide §1D (confetti: 12–20, brand colors, gravity arc, 600–1200ms; sparkle: 4–6,
  800ms staggered), self-cleans. Counts/colors/durations read from existing tokens
  (`--confetti-*`, `--sparkle-*`). No-op under reduced-motion.
- **`LiConfetti` / `LiSparkle`** components: declarative wrappers that fire on a `trigger` prop or
  slot event — used by success moments (RSVP, achievement unlock, level-up, match close).

### 3.4 `useCursorAwareness` composable
`src/design-system/composables/useCursorAwareness.js` — desktop-only (pointer: fine), reduced-motion-safe.
- Returns directives/handlers for three guide §1B effects:
  - **spotlight**: radial brand-tint gradient following cursor over a mesh region.
  - **tilt**: `rotateX/rotateY` tracked to cursor within an element bounds (max `--rotate-dynamic`).
  - **magnetic**: element shifts toward cursor within a radius (extracted from existing
    `LiMagneticButton` so any CTA can adopt it).
- No-ops on touch devices and under reduced-motion.

### 3.5 Page transitions — View Transitions API
- In `src/router/index.js` (or `App.vue`): opt into `document.startViewTransition` for route changes
  where supported; graceful no-op elsewhere. Push = new slides from right + old dims; back = reverse
  (guide §1J). Shared-element `view-transition-name` on hero titles + avatars where they appear on
  both source/destination.
- Modals/sheets keep existing `LiModal`/`LiBottomSheet` transitions.

### 3.6 `LiScrollProgress` component
`src/design-system/components/LiScrollProgress.vue` — fixed top 3px bar, `--gradient-brand`,
`scaleX` bound to scroll via `requestAnimationFrame` throttle (guide §1I). Mounted once in `AppLayout`.

### 3.7 Noise-texture utility
A single `.li-textured` utility class layers a 2px SVG noise tile at `--glass-noise-opacity` with
`mix-blend-mode: overlay` onto large surfaces — `LiGlassCard`, `LiGlassPanel`, `LiModal` backdrop,
`LiBottomSheet` (guide §1C). The class is applied by adding a `textured` boolean prop (default
`true` for large/hero surfaces, `false` for compact) to those glass components; bespoke surfaces add
`.li-textured` directly. Never on small elements (buttons/inputs/badges) — noise reads dirty small.

### 3.8 Component-promotion pass (guide §6)
- Primary CTAs across all views: `LiButton` → **`LiMagneticButton`** (one primary per screen).
- Default content surfaces: `LiCard` → **`LiGlassCard`** over mesh/ambient backgrounds; `LiCard`
  (solid) kept only for dense data rows where glass is noisy (guide §6.2).
- Nav / tab-bar icons: emoji → **SVG via `LiIcon`** (emoji reads cheap — slop tell).

### 3.9 New tokens — additive only, if needed
Anticipated: a dark-canvas ambient ramp and spotlight token already exist
(`--glass-bg-dark`, `--spotlight-color`). Add new tokens only if a signature need is unmet, and
document each in `tokens.css` with a comment. No silent invention.

## 4. Shell — `AppLayout.vue` (Phase 1)

- **Ambient header:** `LiMeshBackground` (warm light / deep dark) behind the existing glass bar;
  depth-layered per guide §7.3; brand mark gets a subtle `lith-float`. Header bg opacity rises on
  scroll (0.5 → 0.85) with bottom border fade-in (guide §6.3).
- **Nav consolidation (desktop):** 10 pills is kaku. Reduce to primary 5 — **Feed, Meets, Clubs,
  Leaderboard, Profile** — plus an overflow **More** (`LiDropdown` or `LiBottomSheet`-style) holding
  Competitions, Network, Achievements, Challenges, Stats. Same discipline as the existing mobile tab
  bar. Active indicator slides between items (300ms `--ease-smooth`), never jump (guide §6.3).
- **`LiCommandPalette` (Ctrl/Cmd+K):** quick jump to any route + theme toggle + sign-out. Premium
  power-nav, on-guide (guide §6 enterprise pattern).
- **`LiThemeToggle`** in header, next to `NotificationsBell`.
- **`LiScrollProgress`** mounted at shell root.
- **Page transitions** on route change (§3.5).
- **Mobile bottom tab bar:** keep 5-icon structure, swap emoji → SVG icons, active indicator slides,
  safe-area insets preserved (already present). Haptic on tap where supported.
- **Destinations unchanged** — no new routes, no auth/RLS changes. Sign-out, notifications, brand,
  Allo mark preserved.

## 5. Per-view treatment (Phase 2 flagship → Phase 3 propagate)

Every view: `LiPageHeader` stays (or upgrades into `LiHero` where a hero moment fits), varied layout
(not the same grid everywhere), ≥1 signature moment, dual-mode verified. Script logic untouched —
only `<template>`, `<style>`, and new presentational imports.

| View | Layout change | Signature moment |
|---|---|---|
| **HomeView** | keep sections; tune hero to dual-mode | cinematic entrance + magnetic CTA + cursor spotlight + parallax (already partly there — push + dark-mode tune) |
| **LoginView / SignUpView** | mesh bg + centered glass form card | hero entrance + spring success → route; confetti on signup |
| **MeetsListView** | rich meet cards (format chip, date, venue, host avatar, fill bar) over ambient | live fill-bars (`LiProgress`, X/N) + hover tilt + stagger reveal |
| **CreateMeetView** | glass form + live preview card | preview morphs as fields change; sticky mobile submit bar |
| **MeetDetailView** | immersive meet hero + glass info sections + avatar stack | **RSVP confetti** + magnetic RSVP; shared-element morph from list card |
| **MatchSessionView** | arena layout, immersive-dark even in light mode | **live number-morph scoring + count-up standings + haptic** — the WOW screen |
| **CompetitionsListView** | competition cards (format, status, entrants, progress) | stagger reveal + status glow |
| **CreateCompetitionView** | glass form + live preview | preview morph; sticky submit |
| **CompetitionDetailView** | bracket viz + glass standings | **animated bracket draw-in** + staggered standings rows |
| **LeaderboardView** | premium 3D podium + glass list tiles with rating bars | **3D podium** (gold/silver/bronze, glow on #1) + count-up ratings. PNG export DOM restyled, mechanism untouched |
| **PersonalStatsView** | stat hero + glass tiles + history timeline | **balance-reveal count-up + gold glow** on key numbers |
| **AchievementsView** | glass grid, locked/unlocked states | **sparkle + brand glow on unlock**; XP/level count-up; confetti on level-up |
| **ChallengesView** | weekly/monthly cards | `LiProgress` rings + streak counters + countdown |
| **FeedView** | immersive `PostCard` (glass, media lightbox) | like = spring + sparkle; pull-to-refresh; scroll-fade-edge mask |
| **ClubsView** | club cards (member count, tier, cover tint) | hover tilt + stagger |
| **ClubDetailView** | club hero + members panel + club-feed link | hero entrance; **fix missing club-feed link** (carry-over §5 of prior spec) |
| **NetworkView** | player cards grid | follow = spring + sparkle |
| **ProfileView** | immersive profile hero + stats strip + achievement highlights | hero entrance + count-up stats |
| **NotFoundView** | playful immersive 404 | lost-ball gag, on-brand, animated |

### Carry-over navigation fixes (from prior spec §5 — verify still present)
- `/stats` and `/challenges` reachable from a nav surface.
- `/clubs/:id/feed` linked from `ClubDetailView`.
- `MeetDetailView` Matches tab links to real `MatchSessionView` (no stale placeholder).

## 6. Dual-mode parity rules

- **No hardcoded hex in new markup.** Use semantic tokens (`--color-on-surface`, `--color-surface`,
  `--glass-bg-*`, `--gradient-*`). Token values already flip under `[data-theme="dark"]`.
- **Ambient/mesh must work in both.** Warm mesh over light; orbs + deeper glass over dark. Verify
  contrast (text-on-glass) in both modes.
- **Glow/neon reads in both** but tune intensity — dark tolerates stronger glow.
- **Verify both modes per view** during QA, not just the default.

## 7. Responsive & mobile-native (unchanged bar from prior spec)

- Breakpoints (literal convention in `tokens.css`): 480 / 768 / 1024.
- Bottom tab bar below 768; desktop pill nav + More above.
- Safe-area insets on header + tab bar.
- ≥44×44 tap targets on mobile.
- Bottom sheets over modals on touch.
- Single-column stacking below 768.
- Correct input `type`/`autocomplete`; sticky primary action on long mobile forms.
- Each view checked at 375 / 768 / 1280 in the browser, both themes.

## 8. Anti-slop / Wow Test (guide §10) — per screen

- ≥1 signature moment.
- Screenshot test: does it look like "just another app"? If yes → add depth/motion/texture.
- 5–6 depth layers; nothing flat.
- Alive at idle (mesh drift / glass breathe / glow pulse) — reduced-motion safe.
- No emoji-as-icon in chrome (nav, tabs, buttons); SVG via `LiIcon`.
- No boxy grids / hard borders / sharp corners — organic radius everywhere.
- No linear transitions; every motion has a guide curve + duration.

## 9. Execution shape

- **Phase 0 — Foundation:** §3 (theme, `LiHero`, particles, cursor awareness, page transitions,
  scroll progress, noise utility, component-promotion patterns). Blocks Phases 1–3.
- **Phase 1 — Shell:** §4 `AppLayout` immersive overhaul + nav consolidation + theme toggle +
  command palette + transitions + scroll progress.
- **Phase 2 — Flagship reference (vertical):** HomeView + LeaderboardView + MatchSessionView to the
  full bar (one of each archetype: landing / data / live). **User reviews + approves the look** before
  propagation.
- **Phase 3 — Propagate:** remaining views, grouped (auth, meets, competitions, gamification, feed,
  clubs, network, profile, not-found), each dual-mode + signature + 3-width verified, each spec run.
- **Phase 4 — QA:** full click-through of every nav surface; light/dark toggle across all views; Wow
  Test per screen; reduced-motion pass; `npm test` green.

## 10. Hard constraints

1. **No business-logic changes.** Composables, Supabase calls, RPCs, computed values, event handlers
   untouched. Only `<template>`, `<style>`, and new presentational components/composables.
2. **Preserve every `data-testid`.** 18 `*.spec.js` files assert on them; run each view's spec after
   restyling. New wrappers must not shift where a `data-testid` lives.
3. **Dual-mode parity** — use tokens, never raw hex; verify both themes.
4. **No new runtime dependencies.** View Transitions, `matchMedia`, Vibration, IntersectionObserver
   are all native. `html-to-image` already present for PNG export.
5. **Reduced-motion safe** — every signature moment degrades to instant/static (guide §9).
6. **Additive tokens only** — flag unmet needs, document in `tokens.css`, never invent silently.

## 11. Out of scope

- New routes, features, auth/RLS/schema changes.
- `tokens.css` value rewrites (already guide-aligned).
- Native wrapper.
- Leaderboard PNG export mechanism (only the captured DOM restyles).
- Redesigning business data shapes or API contracts.
