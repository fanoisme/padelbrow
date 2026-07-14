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
- Shell: `AppLayout.vue` (nav already modernized in the last commit — only touch if a shared
  page-header pattern needs shell-level support)

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

## 4. Hard Constraints

1. **No logic changes.** Composables, Supabase calls, RPCs, computed values, event handlers —
   untouched. This is a template/style-only pass.
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

## 5. Execution Shape

Each view file is independent (only shared dependency: `LiPageHeader` must exist before any
view can use it). This suits parallel, per-view execution:

1. Build `LiPageHeader` first (single task, blocks everything else).
2. Restyle all remaining views in parallel/independent tasks, grouped by the categories in
   §3 for consistency of pattern, each verified against its own existing spec file.
3. Final pass: manual visual check via dev server across one sample view per category
   (e.g. `ClubsView`, `MeetDetailView`, `LoginView`, `AchievementsView`, `LeaderboardView`)
   plus a dark-mode toggle check.

## 6. Out of Scope

- No changes to routing, auth flow, RLS policies, or Supabase schema.
- No new features (no new gamification mechanics, no new stats).
- No redesign of `HomeView.vue` or `AppLayout.vue` nav (already modernized).
- No changes to the PNG export mechanism in `LeaderboardView`.
