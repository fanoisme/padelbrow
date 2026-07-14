# App-Wide UI/UX Consistency Rework — Design Spec

**Date:** 2026-07-14
**Status:** Approved for implementation

## 1. Summary

The app's UI/UX reads as inconsistent and dated across most screens. The landing page
([HomeView.vue](../../../src/views/HomeView.vue), commit `a22f4fb`) was recently redesigned
using the existing Lithium design system (`src/design-system/`) — glass cards, gradient/brand
accents, scroll-reveal animations, pill nav. Every other view (auth, clubs, meets, network,
profile, feed, competitions, gamification, stats) was built earlier (phases p1-p9) with raw
`<div>`/scoped-CSS markup that barely touches the `Li*` component library, using only isolated
components like `LiBadge` here and there.

This is a **presentation-only rework**: no new features, no changes to composables, RPC calls,
Supabase queries, or business logic. The goal is to bring all remaining views up to the same
visual bar as the landing page, using the design system that already exists.

**Scope — all views in one pass:**
- Auth: `LoginView`, `SignUpView`
- Core: `HomeView` (already done, no change), `ClubsView`, `ClubDetailView`, `NetworkView`, `ProfileView`
- Meets: `MeetsListView`, `MeetDetailView`, `CreateMeetView`, `MatchSessionView`
- Gamification: `AchievementsView`, `ChallengesView`, `LeaderboardView`, `PersonalStatsView`
- Feed: `FeedView`
- Competitions: `CompetitionsListView`, `CompetitionDetailView`, `CreateCompetitionView`
- Shell: `AppLayout.vue` — nav content/links already modernized in the last commit, but it
  needs a **mobile-native bottom tab bar** per §4 (this widens the "no change" note from the
  original draft: the nav *destinations* stay the same, only how they're presented on small
  screens changes).

## 2. Shared Foundation — one new component

Every non-landing view currently opens with a raw `<h1>` (and sometimes a stray `<p>` for a
subtitle). Add a single new component so every page gets the same header treatment instead of
each view improvising its own:

**`src/design-system/components/LiPageHeader.vue`**
- Props: `eyebrow?` (string, optional small pill/label above the title — mirrors the landing
  hero's `hero__eyebrow` chip), `title` (string, required), `subtitle?` (string, optional).
- Visually: reuses the landing page's `section__title`/`section__sub` type scale and spacing
  tokens, but sized for in-app pages (smaller than the hero, comparable to the landing
  "FEATURES"/"HOW IT WORKS" section headers).
- Wrapped in a default `LiRevealOnScroll` fade-up so every page gets a consistent entrance,
  matching the landing page's motion language.
- Exported from `src/design-system/components/index.js` alongside the existing components.

This is the only new component. Everything else is re-wiring existing `Li*` components into
existing views.

## 3. Per-View-Type Restyle Pattern

Applied consistently across the view groups; each view keeps its existing script logic
(composables, computed, methods) untouched — only `<template>` markup and `<style>` change.

- **List/grid views** (`ClubsView`, `MeetsListView`, `NetworkView`, `FeedView`,
  `CompetitionsListView`, leaderboard rows in `LeaderboardView`): wrap each item in
  `LiCard` or `LiGlassCard`; wrap the list/grid in `LiRevealOnScroll` with `stagger` for
  staggered entrance; add the standard hover-lift shadow already defined in tokens
  (`--shadow-hover`, `--transition-hover-lift`).
- **Detail views** (`ClubDetailView`, `MeetDetailView`, `CompetitionDetailView`,
  `MatchSessionView`): each content block (info panel, participants, actions, scoring)
  becomes a `LiCard`/`LiGlassCard` section; buttons become `LiButton`; status/tier/role
  labels become `LiBadge`. `MatchSessionView` needs care — it's the live-scoring UI, so
  restyle the chrome around it without altering the round/score interaction flow.
- **Forms** (`LoginView`, `SignUpView`, `CreateMeetView`, `CreateCompetitionView`): inputs
  become `LiTextField`/`LiSelect`/`LiCheckbox` as applicable, submit actions become
  `LiButton`, the form itself sits inside a `LiGlassCard` panel — echoing the landing page's
  glass aesthetic rather than a plain white box.
- **Gamification** (`AchievementsView`, `ChallengesView`): replace the hand-rolled XP bar
  div with `LiProgress`; XP/level numbers get `LiCountUp` for the same "alive" feel as the
  landing page's animated text; achievement cards get the brand glow treatment
  (`--shadow-glow` / `--shadow-glow-intense`) on unlock instead of a plain border-color swap.
- **Stats/Leaderboard** (`PersonalStatsView`, `LeaderboardView`): stat tiles and the podium
  become `LiCard`/`LiGlassCard`; the existing PNG-export logic in `LeaderboardView` is left
  completely untouched — only the DOM being exported gets restyled, not the export mechanism.
- **Profile** (`ProfileView`): same card/button/badge treatment as detail views.

## 4. Responsive & Mobile-Native Requirements

Every restyled view must be genuinely responsive and feel like a native mobile app, not a
desktop layout that just reflows. This applies across all views in §1, not as a separate pass.

- **Standard breakpoints.** CSS custom properties can't be read inside `@media` conditions, so
  breakpoints are a documented literal-value convention (added as a comment block at the top
  of `tokens.css`, next to the existing token groups) used identically everywhere:
  `480px` (phone), `768px` (tablet / nav collapse point), `1024px` (wide desktop content cap).
  This replaces the current ad hoc, inconsistent `max-width: 720px` used in only `HomeView`
  and `AppLayout`.
- **Bottom tab bar on mobile.** Below the `768px` breakpoint, `AppLayout`'s nav switches from
  the horizontal scrolling pill row to a fixed bottom tab bar (the standard native-app
  pattern) for the primary destinations (Home/Feed, Meets, Clubs, Leaderboard, Profile — cap
  at 5 icons, matching common mobile tab-bar limits). Secondary destinations (Network,
  Achievements, Challenges, Competitions) move into a "More" entry that opens a `LiBottomSheet`
  listing them. Above `768px`, the existing pill nav in the header is unchanged.
- **Safe-area insets.** The sticky header and new bottom tab bar use
  `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` padding so content isn't obscured
  by notches/home-indicators on modern phones.
- **Touch targets.** All interactive elements (buttons, nav items, form controls, tab bar
  icons) are at least 44x44px on mobile widths, per standard mobile tap-target guidance.
- **Bottom sheets over modals on touch.** Any view currently using (or gaining) a modal-style
  interaction (filters, confirmations, secondary actions) uses `LiBottomSheet` at mobile
  widths instead of a centered dialog — reads as native on touch devices. Desktop widths can
  keep a centered modal if that's what the component already does.
- **Single-column stacking.** Multi-column grids (feature/card grids, stat tiles, podium,
  achievement grid) collapse to a single column below `768px`; side-by-side detail layouts
  (e.g. `MeetDetailView`'s info + actions) stack vertically on mobile.
- **Mobile-appropriate form inputs.** Inputs use correct `type`/`autocomplete` (e.g. `email`,
  `tel`, `number`) so mobile keyboards match the expected input, and long forms
  (`CreateMeetView`, `CreateCompetitionView`) keep the primary submit action reachable
  (sticky bottom action bar) rather than requiring a scroll back up on small screens.
- **Verification.** In addition to the spec-file check in §6 Hard Constraints, each restyled
  view is checked at three widths — 375px (phone), 768px (tablet), 1280px (desktop) — using
  the in-app browser preview, not just eyeballed at one size.

## 5. Navigation Audit & Fixes

Code audit against `src/router/index.js` found real navigation defects — orphan routes and a
dead-end tab — that must be fixed as part of this rework, not just restyled around:

1. `/stats` (`PersonalStatsView`) has **zero nav link anywhere** in the app (not in
   `AppLayout`'s pill nav, not cross-linked from any other view) — unreachable except by
   typing the URL directly. Add it to the desktop pill nav and the mobile bottom tab bar /
   More sheet (§4).
2. `/challenges` (`ChallengesView`) — same defect, same fix.
3. `/clubs/:id/feed` (route name `club-feed`) is never linked from `ClubDetailView` — add a
   "Club feed" link/tab there.
4. `MeetDetailView`'s "Matches" tab is a stale Phase 4 placeholder
   (`<LiEmptyState title="Matches open in Phase 4">`) that was never wired up, even though
   `MatchSessionView` has existed and worked since Phase 4. Replace the placeholder with a
   real link/button to the match-session route (`/meets/:meetId/match-session`) —
   `MatchSessionView` already bootstraps a new session when no `sessionId` is given, so this
   is template wiring, not new business logic.

General correctness checklist applied to every nav surface (desktop pills, mobile tab bar,
More sheet, in-page cross-links) while restyling:

- Every route in `router/index.js` is reachable from at least one nav surface or a natural
  in-app flow (no orphan routes beyond intentionally-implicit ones like `not-found`).
- Active-state highlighting still works correctly for nested routes (e.g. `/clubs/:id`
  correctly highlights the "Clubs" pill/tab) after the restyle.
- Auth-gated nav items only render for signed-in users — the existing `v-if="user"` pattern
  in `AppLayout` is preserved, not broken by the restyle.
- If adding `/stats` and `/challenges` makes the desktop pill row too crowded (10 items + bell
  + sign out), fold the least-frequent items into a small overflow "More" affordance rather
  than letting the row silently overflow — same instinct as the mobile More sheet in §4,
  applied to desktop.

## 6. Hard Constraints

1. **No business-logic changes, but navigation wiring fixes are in scope.** Composables,
   Supabase calls, RPCs, computed values, and event handlers stay untouched. Adding missing
   `router-link`/button elements and replacing the stale `MeetDetailView` Matches placeholder
   (§5) counts as template/routing wiring, not business logic, and is in scope.
2. **Preserve test selectors.** 18 `*.spec.js` files assert on `data-testid` attributes and/or
   rendered text (e.g. `AchievementsView.spec.js` expects `data-testid="achievement-card"`).
   Every existing `data-testid` must survive the restyle unchanged; new wrapper elements
   (e.g. `LiCard`) must not shift where an existing `data-testid` lives in a way that breaks
   `find()`/`querySelector` lookups in specs. Run each view's spec file after restyling it.
3. **Dark mode compatibility.** `tokens.css` already defines a full `[data-theme="dark"]`
   override set — don't hardcode raw hex colors in new markup; use the semantic tokens
   (`--color-on-surface`, `--color-surface`, etc.) so dark mode keeps working.
4. **No new dependencies, no new design tokens.** Everything needed already exists in
   `tokens.css` and `design-system/components/`. If a view's need genuinely can't be met by
   an existing token/component, flag it during implementation rather than inventing a new one
   ad hoc.

## 7. Execution Shape

Each view file is independent (shared dependencies: `LiPageHeader` and the breakpoint
convention/bottom-tab-bar must exist before per-view restyling leans on them). This suits
parallel, per-view execution:

1. Build `LiPageHeader` and the `AppLayout` bottom tab bar + breakpoint convention first
   (blocks everything else).
2. Restyle all remaining views in parallel/independent tasks, grouped by the categories in
   §3, applying the §4 responsive/mobile-native requirements and the §5 navigation fixes as
   part of the same pass (not a separate follow-up), each verified against its own existing
   spec file.
3. Final pass: manual visual check via dev server across one sample view per category
   (e.g. `ClubsView`, `MeetDetailView`, `LoginView`, `AchievementsView`, `LeaderboardView`)
   at 375px / 768px / 1280px widths, a dark-mode toggle check, and a full click-through of
   every nav surface (desktop pills, mobile tab bar, More sheet) confirming every route in
   §5's checklist is reachable.

## 8. Out of Scope

- No new route definitions, no auth-flow/RLS/Supabase-schema changes — §5's fixes only add
  links/wiring to routes that already exist in `router/index.js`.
- No new features (no new gamification mechanics, no new stats).
- No redesign of `HomeView.vue`'s content (already modernized). `AppLayout` changes are the
  mobile bottom tab bar (§4) plus the missing-link fixes and possible desktop overflow "More"
  affordance (§5) — not a full nav redesign.
- No changes to the PNG export mechanism in `LeaderboardView`.
- No native app wrapper (Capacitor/Cordova/etc.) — "mobile-native" here means the web app
  *feels* native in a mobile browser/PWA context, not a compiled native shell.
