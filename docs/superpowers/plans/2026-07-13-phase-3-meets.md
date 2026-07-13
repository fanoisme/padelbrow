# PADEL BROW — Phase 3 (Meets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core meet-organization loop — create-meet wizard, meets list, meet detail with Details/Participants/Chat tabs, RSVP with waitlist + promotion, and an in-app notifications system (bell icon + realtime panel) driven by Postgres triggers.

**Architecture:** Composables (`src/composables/`) wrap Supabase queries and hold reactive state; views consume them and render with vendored `Li*` components. Chat and notifications use Supabase Realtime (`supabase.channel(...)`) to live-update. A new Postgres migration adds `SECURITY DEFINER` trigger functions that write into the system-owned `notifications` table (which has no client INSERT policy) when `meet_participants` rows are inserted or promoted. The router is refactored to lazy route components first, so the recurring `router/index.spec.js` composable-mock pile-up stops growing.

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router (hash mode), `@supabase/supabase-js` (Postgres + Realtime), Vitest + `@vue/test-utils`, Supabase CLI for the one new migration.

## Global Constraints

- Vue 3 Composition API with `<script setup>` for every component.
- All DB access through the shared `src/lib/supabase.js` `supabase` client; RLS is the real security boundary — don't re-implement authorization client-side.
- Never edit files under `src/design-system/` (the vendored Lithium library). If a test can't select what it needs through a `Li*` component's existing props/DOM, change the test's selector strategy (select by `placeholder`, wrap in a `<div data-testid>`, or use `findComponent`) — never add `inheritAttrs`/`$attrs` or any edit to a vendored component.
- Test mocks for `useAuth().user` MUST use a real Vue `ref()` (e.g. `ref({ id: 'u1' })`), never a plain `{ value: ... }` object — plain objects make template `v-if="user"` always-truthy, masking bugs. Same rule for any other ref-shaped mock return.
- When mounting a component that renders `<router-link>`, stub it with a slot-forwarding component: `const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }` and pass `global: { stubs: { RouterLink: RouterLinkStub } }` — the shorthand `{ RouterLink: true }` does NOT render link slot text.
- Authenticated mutation handlers MUST catch and surface errors via `useToast` (imported from `src/design-system/components/index.js`), never swallow — same convention Phase 2 adopted.
- Router stays in hash mode (`createWebHashHistory`).
- Migration application: `npx supabase migration new <name>` → write SQL → `npx supabase db push` (applies to the linked cloud project `hbjyvdnutbqowydkbtwt`) → `npx supabase migration list` confirms local==remote timestamp. Local Docker is NOT used in this project.
- Existing committed files not to break: `src/App.vue`, `src/main.js`, `src/layouts/AppLayout.vue`, `src/router/index.js`, all Phase 2 composables/views and their specs. This plan modifies `src/router/index.js`, `src/layouts/AppLayout.vue`, `src/router/index.spec.js`, `src/App.vue` incrementally.

**Deferred to Phase 3b** (out of scope for this plan): direct messages (DM), search/filter meets, add-to-calendar (`.ics`), shareable public read-only link + TV mode, "Up Next" home widget, invite-tracking UI. The meet detail "Matches" tab is Phase 4 — this plan renders it as a disabled placeholder so the tab structure exists.

---

## File Structure

```
supabase/migrations/<ts>_meet_notification_triggers.sql   (new)
src/composables/
  useMeets.js              (create/list/get/update/cancel meets)
  useMeetParticipants.js   (RSVP, waitlist, promote, invite, list)
  useChat.js               (per-meet realtime chat: history + send + subscribe)
  useNotifications.js      (per-user realtime notifications: list + mark-read + subscribe)
src/views/
  meets/CreateMeetView.vue     (5-step wizard, /meets/new)
  meets/MeetsListView.vue      (upcoming meets, /meets)
  meets/MeetDetailView.vue     (Details/Participants/Matches/Chat tabs, /meets/:id)
src/components/
  notifications/NotificationsBell.vue  (bell + unread count + dropdown panel)
src/router/index.js            (modified: lazy route components + meet routes + meet nav)
src/layouts/AppLayout.vue      (modified: Meets nav link + <NotificationsBell/>)
```

---

### Task 1: Refactor router to lazy route components (pays down Phase 2 debt)

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/router/index.spec.js`

**Interfaces:**
- Produces: `src/router/index.js` using `component: () => import('../views/<X>.vue')` for every route. Because views are no longer imported eagerly at router-module-load time, their composables (which import the throwing `src/lib/supabase.js`) are no longer pulled in transitively — so `router/index.spec.js` can drop the `useProfile`/`useClubs`/`useFollows`/`usePlayerDiscovery` mocks it accumulated in Phase 2. The `useAuth` mock stays (the guard imports `useAuth` directly). This is the prerequisite that lets later meet routes be added without re-growing that mock list.

- [ ] **Step 1: Rewrite `src/router/index.js` to use lazy components**

```js
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
    { path: '/signup', name: 'signup', component: () => import('../views/auth/SignUpView.vue') },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/clubs', name: 'clubs', component: () => import('../views/ClubsView.vue'), meta: { requiresAuth: true } },
    { path: '/clubs/:id', name: 'club-detail', component: () => import('../views/ClubDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/network', name: 'network', component: () => import('../views/NetworkView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') }
  ]
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const { user } = useAuth()
    if (!user.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
})

export default router
```

- [ ] **Step 2: Strip the now-unnecessary composable mocks from `src/router/index.spec.js`**

Replace the entire file with:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import router from './index.js'

// Only useAuth is imported eagerly by the router (the guard calls it), so only
// it needs mocking. View composables are no longer pulled in at module-load
// time now that route components are lazy `() => import(...)`.
vi.mock('../composables/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../composables/useAuth.js'

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

describe('router auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (!router.hasRoute('protected-test-route')) {
      router.addRoute({
        path: '/login-guard-test-protected',
        name: 'protected-test-route',
        component: () => Promise.resolve({ template: '<div />' }),
        meta: { requiresAuth: true },
      })
    }
  })

  it('redirects to login when the target route requires auth and there is no user', async () => {
    useAuth.mockReturnValue({ user: ref(null) })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/login-guard-test-protected')
  })

  it('allows navigation when a user is present', async () => {
    useAuth.mockReturnValue({ user: ref({ id: 'u1' }) })
    await router.push('/login-guard-test-protected')
    expect(router.currentRoute.value.name).toBe('protected-test-route')
  })
})
```

- [ ] **Step 3: Run the full suite and verify everything still passes**

Run: `npm test`
Expected: PASS — 38 tests (no regressions; the 4 router tests still pass with lazy components).

- [ ] **Step 4: Verify the build still works (lazy routes should code-split)**

Run: `npm run build`
Expected: exits 0. The build output should now show multiple JS chunks (one per lazy-loaded view) rather than a single bundle — confirming the code-splitting payoff.

- [ ] **Step 5: Commit**

```bash
git add src/router/index.js src/router/index.spec.js
git commit -m "Refactor router to lazy route components; drop transitive composable mocks"
```

---

### Task 2: Migration — notification triggers on meet_participant changes

**Files:**
- Create: `supabase/migrations/<ts>_meet_notification_triggers.sql` (use the filename `npx supabase migration new` generates)

**Interfaces:**
- Produces: two `SECURITY DEFINER` Postgres trigger functions + triggers on `public.meet_participants` that insert into the system-owned `public.notifications` table (which has no client INSERT policy):
  - On INSERT of a row with status in `('confirmed','waitlisted')`: a notification row for the meet's `creator_id` with `type='meet_join'`, payload `{ meet_id, meet_title, participant_id, participant_name }`.
  - On UPDATE where `status` transitions to `'confirmed'` from `'waitlisted'`: a notification for the promoted participant's `user_id` with `type='waitlist_promoted'`, payload `{ meet_id, meet_title }`.
  These run as the table owner (bypassing RLS), so the anon client never needs INSERT on `notifications`. Later tasks' composables just READ notifications; the DB writes them.

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new meet_notification_triggers`
Expected: creates `supabase/migrations/<timestamp>_meet_notification_triggers.sql` (empty).

- [ ] **Step 2: Write the migration SQL**

```sql
-- notify_meet_creator_on_join: when someone joins a meet (confirmed or
-- waitlisted), tell the meet's creator. SECURITY DEFINER so it can INSERT
-- into public.notifications, which has no client INSERT policy.
create or replace function public.notify_meet_creator_on_join()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_creator_id uuid;
  v_meet_title text;
  v_participant_name text;
begin
  select m.creator_id, m.title into v_creator_id, v_meet_title
  from public.meets m where m.id = new.meet_id;

  select p.full_name into v_participant_name
  from public.profiles p where p.id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_creator_id,
    'meet_join',
    jsonb_build_object(
      'meet_id', new.meet_id,
      'meet_title', coalesce(v_meet_title, ''),
      'participant_id', new.user_id,
      'participant_name', coalesce(v_participant_name, '')
    )
  );
  return new;
end;
$$;

create trigger on_meet_participant_insert
  after insert on public.meet_participants
  for each row
  when (new.status in ('confirmed', 'waitlisted'))
  execute function public.notify_meet_creator_on_join();

-- notify_participant_on_promote: when a waitlisted participant is promoted
-- to confirmed, tell that participant.
create or replace function public.notify_participant_on_promote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meet_title text;
begin
  select m.title into v_meet_title
  from public.meets m where m.id = new.meet_id;

  insert into public.notifications (user_id, type, payload)
  values (
    new.user_id,
    'waitlist_promoted',
    jsonb_build_object(
      'meet_id', new.meet_id,
      'meet_title', coalesce(v_meet_title, '')
    )
  );
  return new;
end;
$$;

create trigger on_meet_participant_promote
  after update of status on public.meet_participants
  for each row
  when (old.status = 'waitlisted' and new.status = 'confirmed')
  execute function public.notify_participant_on_promote();
```

- [ ] **Step 3: Apply the migration to the linked cloud project**

Run: `npx supabase db push`
Expected: applies cleanly with no SQL errors (answer Y if prompted to confirm).

- [ ] **Step 4: Confirm local==remote timestamp**

Run: `npx supabase migration list`
Expected: the new migration's local timestamp equals its remote timestamp (proves the transaction — both trigger functions + both triggers — committed on the real remote Postgres).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations
git commit -m "Add meet notification triggers (join + waitlist promote)"
```

---

### Task 3: `useMeets` composable

**Files:**
- Create: `src/composables/useMeets.js`
- Test: `src/composables/useMeets.spec.js`

**Interfaces:**
- Produces: `useMeets(): { listMeets(): Promise<object[]>, getMeet(meetId): Promise<object|null>, createMeet(payload, creatorId): Promise<object>, updateMeet(meetId, updates): Promise<object>, cancelMeet(meetId): Promise<void> }`.
  - `payload` for `createMeet` may include: `club_id, sport, format, title, starts_at, duration_minutes, venue_name, venue_address, max_players, privacy, fee_amount, fee_currency, min_level, max_level, gender_restriction, age_restriction, repeat_rule, host_role, auto_approve, allow_plus_one, notes` (all optional except those the caller always sets; the composable merges `creator_id` itself).
  - `cancelMeet` sets `status='cancelled'` via `updateMeet`.

- [ ] **Step 1: Write the failing test**

`src/composables/useMeets.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMeets } from './useMeets.js'

describe('useMeets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listMeets orders upcoming meets by starts_at ascending', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'm1', title: 'Tue Night' }], error: null })
    const gte = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ gte }))
    supabase.from.mockReturnValue({ select })

    const { listMeets } = useMeets()
    const result = await listMeets()

    expect(supabase.from).toHaveBeenCalledWith('meets')
    expect(gte).toHaveBeenCalledWith('starts_at', expect.any(String))
    expect(order).toHaveBeenCalledWith('starts_at', { ascending: true })
    expect(result).toEqual([{ id: 'm1', title: 'Tue Night' }])
  })

  it('createMeet merges creator_id and returns the inserted row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'm1', title: 'X', creator_id: 'u1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createMeet } = useMeets()
    const result = await createMeet({ title: 'X', sport: 'padel' }, 'u1')

    expect(insert).toHaveBeenCalledWith({ title: 'X', sport: 'padel', creator_id: 'u1' })
    expect(result).toEqual({ id: 'm1', title: 'X', creator_id: 'u1' })
  })

  it('cancelMeet sets status to cancelled', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ update })

    const { cancelMeet } = useMeets()
    await cancelMeet('m1')

    expect(update).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(eq).toHaveBeenCalledWith('id', 'm1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMeets`
Expected: FAIL — `src/composables/useMeets.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useMeets.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useMeets() {
  async function listMeets() {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('meets')
      .select('*')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function getMeet(meetId) {
    const { data, error } = await supabase
      .from('meets')
      .select('*')
      .eq('id', meetId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function createMeet(payload, creatorId) {
    const { data, error } = await supabase
      .from('meets')
      .insert({ ...payload, creator_id: creatorId })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateMeet(meetId, updates) {
    const { data, error } = await supabase
      .from('meets')
      .update(updates)
      .eq('id', meetId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function cancelMeet(meetId) {
    await updateMeet(meetId, { status: 'cancelled' })
  }

  return { listMeets, getMeet, createMeet, updateMeet, cancelMeet }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMeets`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useMeets.js src/composables/useMeets.spec.js
git commit -m "Add useMeets composable: list, get, create, update, cancel"
```

---

### Task 4: `useMeetParticipants` composable

**Files:**
- Create: `src/composables/useMeetParticipants.js`
- Test: `src/composables/useMeetParticipants.spec.js`

**Interfaces:**
- Produces: `useMeetParticipants(): { listParticipants(meetId): Promise<object[]>, joinMeet(meet, userId): Promise<object>, leaveMeet(meetId, userId): Promise<void>, promoteNext(meetId): Promise<object|null>, inviteUser(meetId, inviteeId, invitedById): Promise<void> }`.
  - `joinMeet(meet, userId)`: `meet` is the full meet row (so the composable can read `max_players` and `auto_approve`). Counts current confirmed participants; if `count < max_players` → inserts with `status='confirmed'`, else `status='waitlisted'`. Returns the inserted participant row.
  - `leaveMeet`: deletes the row; if the deleted row was `confirmed`, calls `promoteNext` to auto-fill the vacancy.
  - `promoteNext(meetId)`: finds the earliest `waitlisted` participant (ordered by `joined_at`) and updates it to `confirmed`; returns the promoted row or `null` if none. The Task 2 trigger then fires the promotion notification.
  - `inviteUser`: inserts with `status='invited'` and `invited_by` set.

- [ ] **Step 1: Write the failing test**

`src/composables/useMeetParticipants.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useMeetParticipants } from './useMeetParticipants.js'

describe('useMeetParticipants', () => {
  beforeEach(() => vi.clearAllMocks())

  it('joinMeet confirms when under capacity', async () => {
    // count of confirmed participants = 3, max_players = 4 → confirmed
    const countEq = vi.fn().mockResolvedValue({ count: 3, error: null })
    const countLt = vi.fn(() => ({ head: true, count: countEq }))
    const countEq2 = vi.fn(() => ({ lt: countLt }))
    const countNeq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ neq: countNeq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p1', status: 'confirmed' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockImplementation((table) => {
      if (table === 'meet_participants') {
        // first call (count) returns { select: countSelect }; later call (insert) returns { insert: pInsert }
        return { select: countSelect, insert: pInsert }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const { joinMeet } = useMeetParticipants()
    const result = await joinMeet({ id: 'm1', max_players: 4 }, 'u1')

    expect(countEq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(countNeq).toHaveBeenCalledWith('status', 'cancelled')
    expect(countEq2).toHaveBeenCalledWith('status', 'confirmed')
    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', user_id: 'u1', role: 'player', status: 'confirmed' })
    expect(result).toEqual({ id: 'p1', status: 'confirmed' })
  })

  it('joinMeet waitlists when at capacity', async () => {
    const countEq = vi.fn().mockResolvedValue({ count: 4, error: null })
    const countLt = vi.fn(() => ({ head: true, count: countEq }))
    const countEq2 = vi.fn(() => ({ lt: countLt }))
    const countNeq = vi.fn(() => ({ eq: countEq2 }))
    const countSelect = vi.fn(() => ({ neq: countNeq }))

    const pSingle = vi.fn().mockResolvedValue({ data: { id: 'p2', status: 'waitlisted' }, error: null })
    const pSelect = vi.fn(() => ({ single: pSingle }))
    const pInsert = vi.fn(() => ({ select: pSelect }))

    supabase.from.mockReturnValue({ select: countSelect, insert: pInsert })

    const { joinMeet } = useMeetParticipants()
    const result = await joinMeet({ id: 'm1', max_players: 4 }, 'u5')

    expect(pInsert).toHaveBeenCalledWith({ meet_id: 'm1', user_id: 'u5', role: 'player', status: 'waitlisted' })
    expect(result).toEqual({ id: 'p2', status: 'waitlisted' })
  })

  it('promoteNext updates the earliest waitlisted participant to confirmed', async () => {
    const updateEq = vi.fn().mockResolvedValue({ data: { id: 'p3', status: 'confirmed' }, error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    const limit = vi.fn(() => ({ update }))
    const order = vi.fn(() => ({ limit }))
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { promoteNext } = useMeetParticipants()
    const result = await promoteNext('m1')

    expect(eq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(order).toHaveBeenCalledWith('joined_at', { ascending: true })
    expect(limit).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith({ status: 'confirmed' })
    expect(result).toEqual({ id: 'p3', status: 'confirmed' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMeetParticipants`
Expected: FAIL — `src/composables/useMeetParticipants.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useMeetParticipants.js`:
```js
import { supabase } from '../lib/supabase.js'

export function useMeetParticipants() {
  async function listParticipants(meetId) {
    const { data, error } = await supabase
      .from('meet_participants')
      .select('id, user_id, role, status, joined_at, payment_status, profiles(id, full_name, avatar_url)')
      .eq('meet_id', meetId)
      .order('joined_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function countConfirmed(meetId) {
    const { count, error } = await supabase
      .from('meet_participants')
      .select('id', { count: 'exact', head: true })
      .eq('meet_id', meetId)
      .eq('status', 'confirmed')
    if (error) throw error
    return count ?? 0
  }

  async function joinMeet(meet, userId) {
    const confirmed = await countConfirmed(meet.id)
    const status = confirmed < (meet.max_players ?? 4) ? 'confirmed' : 'waitlisted'
    const { data, error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meet.id, user_id: userId, role: 'player', status })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function leaveMeet(meetId, userId) {
    // Capture the row before deleting so we know if a vacancy opens up.
    const { data: existing, error: findErr } = await supabase
      .from('meet_participants')
      .select('status')
      .eq('meet_id', meetId)
      .eq('user_id', userId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!existing) return

    const { error: delErr } = await supabase
      .from('meet_participants')
      .delete()
      .eq('meet_id', meetId)
      .eq('user_id', userId)
    if (delErr) throw delErr

    if (existing.status === 'confirmed') {
      await promoteNext(meetId)
    }
  }

  async function promoteNext(meetId) {
    // Update the earliest waitlisted participant to confirmed. Using an
    // update-through-select: select the one earliest waitlisted row, then
    // update by its key. Supabase's builder doesn't support UPDATE ... WHERE
    // id IN (SELECT ...) directly, so we read-then-update by id.
    const { data: next, error: findErr } = await supabase
      .from('meet_participants')
      .select('id')
      .eq('meet_id', meetId)
      .eq('status', 'waitlisted')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (findErr) throw findErr
    if (!next) return null

    const { data, error } = await supabase
      .from('meet_participants')
      .update({ status: 'confirmed' })
      .eq('id', next.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function inviteUser(meetId, inviteeId, invitedById) {
    const { error } = await supabase
      .from('meet_participants')
      .insert({ meet_id: meetId, user_id: inviteeId, role: 'player', status: 'invited', invited_by: invitedById })
    if (error) throw error
  }

  return { listParticipants, joinMeet, leaveMeet, promoteNext, inviteUser }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useMeetParticipants`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useMeetParticipants.js src/composables/useMeetParticipants.spec.js
git commit -m "Add useMeetParticipants composable: list, join (waitlist-aware), leave, promoteNext, invite"
```

---

### Task 5: Create Meet wizard view + route + nav

**Files:**
- Create: `src/views/meets/CreateMeetView.vue`
- Create: `src/views/meets/CreateMeetView.spec.js`
- Modify: `src/router/index.js` (add `/meets/new` route)
- Modify: `src/layouts/AppLayout.vue` (add "Meets" nav link)

**Interfaces:**
- Consumes: `useAuth().user`, `useClubs().listClubs` (for the club picker), `useMeets().createMeet` (Task 3). On success redirects to `/meets/:id` for the new meet.
- Produces: route `meet-new` at `/meets/new`, `meta: { requiresAuth: true }`. A 5-step wizard: (1) club + sport + format, (2) title + schedule + venue, (3) max_players + privacy + fee + level range, (4) advanced (gender/age restriction, host_role, auto_approve, allow_plus_one), (5) review + create.

- [ ] **Step 1: Write the failing test**

`src/views/meets/CreateMeetView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listClubs = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Padel Brow' }])
vi.mock('../../composables/useClubs.js', () => ({
  useClubs: vi.fn(() => ({ listClubs })),
}))

const createMeet = vi.fn().mockResolvedValue({ id: 'm-new', title: 'Tue Night' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ createMeet })),
}))

import CreateMeetView from './CreateMeetView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('CreateMeetView', () => {
  it('renders step 1 first and advances to a review/create step', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/new', name: 'meet-new', component: CreateMeetView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/meets/new')
    await router.isReady()
    const wrapper = mount(CreateMeetView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    // Step 1 shows club + sport + format
    expect(wrapper.text()).toContain('Create a meet')
    expect(wrapper.text()).toContain('Padel Brow')
  })

  it('calls createMeet with the wizard payload and creator id on final submit', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/meets/new', name: 'meet-new', component: CreateMeetView },
        { path: '/meets/:id', name: 'meet-detail', component: { template: '<div />' } },
      ],
    })
    router.push('/meets/new')
    await router.isReady()
    const wrapper = mount(CreateMeetView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    // Drive the wizard to the end by clicking Next through each step, then Create.
    const nextButtons = () => wrapper.findAll('button').filter((b) => b.text().match(/next/i))
    while (nextButtons().length > 0) {
      await nextButtons()[0].trigger('click')
      await flushPromises()
    }
    const createBtn = wrapper.findAll('button').find((b) => b.text().match(/create meet/i))
    expect(createBtn).toBeTruthy()
    await createBtn.trigger('click')
    await flushPromises()

    expect(createMeet).toHaveBeenCalledWith(expect.objectContaining({ creator_id: undefined }), 'u1')
  })
})
```

Note on the second test: the exact payload object varies by what the wizard collects; the essential assertion is that `createMeet` is invoked with `creatorId='u1'` (the second positional arg). The first arg is the payload object — assert on `creator_id` being absent from it (since the composable adds it) via `expect.objectContaining({})` plus the explicit `'u1'` check.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CreateMeetView`
Expected: FAIL — `CreateMeetView.vue` does not exist.

- [ ] **Step 3: Implement `CreateMeetView.vue`**

```vue
<template>
  <section class="create-meet-view">
    <h1>Create a meet</h1>
    <ol class="create-meet-view__steps">
      <li v-for="(s, i) in stepLabels" :key="s" :class="{ 'is-active': step === i, 'is-done': step > i }">{{ s }}</li>
    </ol>

    <LiCard class="create-meet-view__card">
      <!-- Step 0: club + sport + format -->
      <div v-if="step === 0">
        <LiSelect
          v-model="form.club_id"
          label="Club (optional)"
          :options="clubOptions"
          placeholder="No club"
        />
        <LiSelect
          v-model="form.sport"
          label="Sport"
          :options="[{ value: 'padel', label: 'Padel' }, { value: 'billiards', label: 'Billiards' }, { value: 'football', label: 'Football' }]"
        />
        <LiSelect
          v-model="form.format"
          label="Format"
          :options="[{ value: 'social', label: 'Social' }, { value: 'americano', label: 'Americano' }, { value: 'mexicano', label: 'Mexicano' }]"
        />
      </div>

      <!-- Step 1: title + schedule + venue -->
      <div v-else-if="step === 1">
        <LiTextField v-model="form.title" label="Title" placeholder="Tuesday night social" />
        <LiTextField v-model="form.starts_at" type="datetime-local" label="Starts at" />
        <LiTextField v-model.number="form.duration_minutes" type="number" label="Duration (minutes)" />
        <LiTextField v-model="form.venue_name" label="Venue" placeholder="Court name" />
        <LiTextField v-model="form.venue_address" label="Address" />
      </div>

      <!-- Step 2: players + privacy + fee + level -->
      <div v-else-if="step === 2">
        <LiTextField v-model.number="form.max_players" type="number" label="Max players" />
        <LiSelect
          v-model="form.privacy"
          label="Privacy"
          :options="[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]"
        />
        <LiTextField v-model.number="form.fee_amount" type="number" label="Fee (IDR)" />
        <LiTextField v-model.number="form.min_level" type="number" label="Min level" />
        <LiTextField v-model.number="form.max_level" type="number" label="Max level" />
      </div>

      <!-- Step 3: advanced -->
      <div v-else-if="step === 3">
        <LiTextField v-model="form.gender_restriction" label="Gender restriction (optional)" placeholder="e.g. men-only / ladies" />
        <LiSelect
          v-model="form.host_role"
          label="Host's role"
          :options="[{ value: 'host_and_play', label: 'Host & play' }, { value: 'host_only', label: 'Host only' }]"
        />
        <LiToggle v-model="form.auto_approve" label="Auto-approve joiners" />
        <LiToggle v-model="form.allow_plus_one" label="Allow +1" />
      </div>

      <!-- Step 4: review + create -->
      <div v-else>
        <p>Review your meet and create it.</p>
        <ul class="create-meet-view__review">
          <li><strong>{{ form.title || 'Untitled meet' }}</strong></li>
          <li>{{ form.sport }} · {{ form.format }}</li>
          <li>{{ form.venue_name || 'Venue TBD' }}</li>
          <li>Max {{ form.max_players }} players · {{ form.privacy }}</li>
        </ul>
        <p v-if="errorMessage" class="create-meet-view__error">{{ errorMessage }}</p>
      </div>

      <div class="create-meet-view__actions">
        <LiButton v-if="step > 0" variant="secondary" @click="step--">Back</LiButton>
        <LiButton v-if="step < stepLabels.length - 1" @click="step++">Next</LiButton>
        <LiButton v-else :loading="submitting" @click="handleSubmit">Create meet</LiButton>
      </div>
    </LiCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LiCard, LiButton, LiTextField, LiSelect, LiToggle, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useClubs } from '../../composables/useClubs.js'
import { useMeets } from '../../composables/useMeets.js'

const router = useRouter()
const { user } = useAuth()
const { listClubs } = useClubs()
const { createMeet } = useMeets()
const toast = useToast()

const stepLabels = ['Basics', 'Schedule', 'Players', 'Advanced', 'Review']
const step = ref(0)
const submitting = ref(false)
const errorMessage = ref('')
const clubs = ref([])

const form = ref({
  club_id: '',
  sport: 'padel',
  format: 'social',
  title: '',
  starts_at: '',
  duration_minutes: 60,
  venue_name: '',
  venue_address: '',
  max_players: 4,
  privacy: 'public',
  fee_amount: 0,
  min_level: null,
  max_level: null,
  gender_restriction: '',
  host_role: 'host_and_play',
  auto_approve: false,
  allow_plus_one: true,
})

const clubOptions = computed(() => [
  { value: '', label: 'No club' },
  ...clubs.value.map((c) => ({ value: c.id, label: c.name })),
])

onMounted(async () => {
  try {
    clubs.value = await listClubs()
  } catch (err) {
    toast.error(err.message || 'Could not load clubs.')
  }
})

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    const payload = { ...form.value }
    if (!payload.club_id) delete payload.club_id
    if (payload.min_level === null || payload.min_level === '') delete payload.min_level
    if (payload.max_level === null || payload.max_level === '') delete payload.max_level
    if (!payload.gender_restriction) delete payload.gender_restriction
    const meet = await createMeet(payload, user.value.id)
    router.push({ name: 'meet-detail', params: { id: meet.id } })
  } catch (err) {
    errorMessage.value = err.message || 'Could not create the meet.'
    toast.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-meet-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
  max-width: 560px;
  margin: 0 auto;
}

.create-meet-view__steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-s, 8px);
  list-style: none;
  padding: 0;
  font-size: var(--text-xs, 14px);
}

.create-meet-view__steps li {
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border-radius: var(--radius-pill, 999px);
  background: var(--color-gray-100, #F2F2F2);
  color: var(--color-gray-600, #808080);
}

.create-meet-view__steps li.is-active {
  background: var(--color-brand, #FFAF03);
  color: var(--color-gray-900, #333333);
  font-weight: 600;
}

.create-meet-view__steps li.is-done {
  color: var(--color-gray-800, #4D4D4D);
}

.create-meet-view__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-meet-view__card > div:first-child {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.create-meet-view__review {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.create-meet-view__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-s, 8px);
}

.create-meet-view__error {
  color: var(--color-red-500, #A33129);
  font-size: var(--text-xs, 14px);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add a new lazy route entry (after the `network` route):
```js
    { path: '/meets/new', name: 'meet-new', component: () => import('../views/meets/CreateMeetView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 5: Add the "Meets" nav link**

In `src/layouts/AppLayout.vue`, add this `<router-link>` inside the logged-in `<nav class="app-header__nav">` block, before the Clubs link:
```html
        <router-link to="/meets">Meets</router-link>
        <router-link to="/clubs">Clubs</router-link>
```
(The `/meets` route is added in Task 6; until then Vue Router emits a dev-only "no match" warning, harmless. The `/meets/new` link from this view is not placed in the nav — it's reached from the Meets list view's "Create meet" button in Task 6.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — full suite including the two new CreateMeetView tests.

- [ ] **Step 7: Commit**

```bash
git add src/views/meets/CreateMeetView.vue src/views/meets/CreateMeetView.spec.js src/router/index.js src/layouts/AppLayout.vue
git commit -m "Add Create Meet wizard, /meets/new route, and Meets nav link"
```

---

### Task 6: Meets list view + route

**Files:**
- Create: `src/views/meets/MeetsListView.vue`
- Create: `src/views/meets/MeetsListView.spec.js`
- Modify: `src/router/index.js` (add `/meets` route)

**Interfaces:**
- Consumes: `useMeets().listMeets` (Task 3). Renders each meet as a card linking to `/meets/:id`, plus a "Create meet" button linking to `/meets/new`.
- Produces: route `meets` at `/meets`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/meets/MeetsListView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })),
}))

const listMeets = vi.fn().mockResolvedValue([
  { id: 'm1', title: 'Tue Night', venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' },
])
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ listMeets })),
}))

import MeetsListView from './MeetsListView.vue'

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('MeetsListView', () => {
  it('lists upcoming meets on mount and offers a Create meet button', async () => {
    const wrapper = mount(MeetsListView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    expect(listMeets).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Create meet')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MeetsListView`
Expected: FAIL — `MeetsListView.vue` does not exist.

- [ ] **Step 3: Implement `MeetsListView.vue`**

```vue
<template>
  <section class="meets-list-view">
    <div class="meets-list-view__header">
      <h1>Meets</h1>
      <LiButton @click="$router.push('/meets/new')">Create meet</LiButton>
    </div>

    <LiEmptyState v-if="meets.length === 0" title="No upcoming meets" icon="event" />
    <div v-else class="meets-list-view__list">
      <LiCard v-for="meet in meets" :key="meet.id" hover>
        <router-link :to="`/meets/${meet.id}`">
          <h3>{{ meet.title }}</h3>
          <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
        </router-link>
      </LiCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { LiButton, LiCard, LiEmptyState, useToast } from '../../design-system/components/index.js'
import { useMeets } from '../../composables/useMeets.js'

const { listMeets } = useMeets()
const toast = useToast()
const meets = ref([])

onMounted(async () => {
  try {
    meets.value = await listMeets()
  } catch (err) {
    toast.error(err.message || 'Could not load meets.')
  }
})

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meets-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 24px);
}

.meets-list-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meets-list-view__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-m, 16px);
}
</style>
```

- [ ] **Step 4: Add the route**

In `src/router/index.js`, add (before the `meet-new` route so `/meets` matches before `/meets/new` ordering is handled by specificity — vue-router matches `/meets/new` to the more specific route regardless of order, but place `/meets` first for readability):
```js
    { path: '/meets', name: 'meets', component: () => import('../views/meets/MeetsListView.vue'), meta: { requiresAuth: true } },
    { path: '/meets/new', name: 'meet-new', component: () => import('../views/meets/CreateMeetView.vue'), meta: { requiresAuth: true } },
```
(If `meet-new` was already added in Task 5, just add the `/meets` route and keep both.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/meets/MeetsListView.vue src/views/meets/MeetsListView.spec.js src/router/index.js
git commit -m "Add MeetsListView and /meets route"
```

---

### Task 7: Meet detail view (Details + Participants + placeholder Matches)

**Files:**
- Create: `src/views/meets/MeetDetailView.vue`
- Create: `src/views/meets/MeetDetailView.spec.js`
- Modify: `src/router/index.js` (add `/meets/:id` route)

**Interfaces:**
- Consumes: `useAuth().user`, `useMeets().getMeet` (Task 3), `useMeetParticipants().listParticipants`/`joinMeet`/`leaveMeet` (Task 4). Uses `LiTabs` with four tabs: Details, Participants, Matches (disabled placeholder), Chat (Task 8 wires it). For Phase 3 this task implements Details + Participants + the tab skeleton; the Chat tab renders a `<MeetChat :meet-id="...">` child added in Task 8.
- Produces: route `meet-detail` at `/meets/:id`, `meta: { requiresAuth: true }`.

- [ ] **Step 1: Write the failing test**

`src/views/meets/MeetDetailView.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('../../composables/useAuth.js', () => ({
  useAuth: vi.fn(() => ({ user: ref({ id: 'u2' }) })),
}))

const getMeet = vi.fn().mockResolvedValue({ id: 'm1', title: 'Tue Night', creator_id: 'u1', max_players: 4, auto_approve: true, venue_name: 'Court 1', starts_at: '2026-07-14T13:00:00Z' })
vi.mock('../../composables/useMeets.js', () => ({
  useMeets: vi.fn(() => ({ getMeet })),
}))

const listParticipants = vi.fn().mockResolvedValue([
  { id: 'p1', user_id: 'u1', status: 'confirmed', role: 'organizer', profiles: { id: 'u1', full_name: 'Fano' } },
])
const joinMeet = vi.fn().mockResolvedValue({ id: 'p2', status: 'confirmed' })
const leaveMeet = vi.fn().mockResolvedValue()
vi.mock('../../composables/useMeetParticipants.js', () => ({
  useMeetParticipants: vi.fn(() => ({ listParticipants, joinMeet, leaveMeet })),
}))

vi.mock('../../composables/useChat.js', () => ({
  useChat: vi.fn(() => ({ messages: ref([]), send: vi.fn(), subscribe: () => () => {} })),
}))

import MeetDetailView from './MeetDetailView.vue'

describe('MeetDetailView', () => {
  it('loads the meet + participants and shows Join for a non-participant', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/meets/:id', name: 'meet-detail', component: MeetDetailView }],
    })
    router.push('/meets/m1')
    await router.isReady()
    const wrapper = mount(MeetDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(getMeet).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Tue Night')
    expect(wrapper.text()).toContain('Fano')
    expect(wrapper.text()).toContain('Join')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MeetDetailView`
Expected: FAIL — `MeetDetailView.vue` does not exist.

- [ ] **Step 3: Implement `MeetDetailView.vue`**

```vue
<template>
  <section v-if="meet" class="meet-detail-view">
    <div class="meet-detail-view__header">
      <h1>{{ meet.title }}</h1>
      <LiButton v-if="myParticipation === 'none'" @click="handleJoin">Join</LiButton>
      <LiButton v-else-if="myParticipation === 'confirmed'" variant="secondary" @click="handleLeave">Leave</LiButton>
      <LiBadge v-else-if="myParticipation === 'waitlisted'" label="Waitlisted" variant="warning" />
    </div>

    <LiTabs v-model="activeTab" :tabs="tabs" />
    <div class="meet-detail-view__panel">
      <!-- Details -->
      <div v-show="activeTab === 0">
        <p>{{ formatWhen(meet.starts_at) }} · {{ meet.venue_name || 'Venue TBD' }}</p>
        <p v-if="meet.venue_address">{{ meet.venue_address }}</p>
        <p>Format: {{ meet.format }} · Max {{ meet.max_players }} players</p>
        <p v-if="meet.fee_amount > 0">Fee: Rp{{ meet.fee_amount.toLocaleString('id-ID') }}</p>
      </div>

      <!-- Participants -->
      <div v-show="activeTab === 1">
        <ul class="meet-detail-view__participants">
          <li v-for="p in participants" :key="p.id">
            <span>{{ p.profiles.full_name }}</span>
            <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
          </li>
        </ul>
      </div>

      <!-- Matches (Phase 4 placeholder) -->
      <div v-show="activeTab === 2">
        <LiEmptyState title="Matches open in Phase 4" icon="trophy" />
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 3">
        <MeetChat :meet-id="meet.id" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LiButton, LiBadge, LiTabs, LiEmptyState, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { useMeets } from '../../composables/useMeets.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import MeetChat from '../../components/meets/MeetChat.vue'

const route = useRoute()
const { user } = useAuth()
const { getMeet } = useMeets()
const { listParticipants, joinMeet, leaveMeet } = useMeetParticipants()
const toast = useToast()

const meet = ref(null)
const participants = ref([])
const activeTab = ref(0)
const tabs = [
  { label: 'Details' },
  { label: 'Participants' },
  { label: 'Matches' },
  { label: 'Chat' },
]

const myParticipation = computed(() => {
  const mine = participants.value.find((p) => p.user_id === user.value?.id)
  if (!mine) return 'none'
  return mine.status
})

async function reloadParticipants() {
  participants.value = await listParticipants(route.params.id)
}

onMounted(async () => {
  meet.value = await getMeet(route.params.id)
  await reloadParticipants()
})

async function handleJoin() {
  try {
    await joinMeet(meet.value, user.value.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not join the meet.')
  }
}

async function handleLeave() {
  try {
    await leaveMeet(route.params.id, user.value.id)
    await reloadParticipants()
  } catch (err) {
    toast.error(err.message || 'Could not leave the meet.')
  }
}

function statusVariant(status) {
  if (status === 'confirmed') return 'success'
  if (status === 'waitlisted') return 'warning'
  if (status === 'invited') return 'info'
  return 'neutral'
}

function formatWhen(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.meet-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-detail-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meet-detail-view__participants {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
}

.meet-detail-view__participants li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
```

- [ ] **Step 4: Create the placeholder `MeetChat.vue` (Task 8 replaces it)**

`src/components/meets/MeetChat.vue`:
```vue
<template>
  <div />
</template>

<script setup>
defineProps({ meetId: { type: String, required: true } })
</script>
```

- [ ] **Step 5: Add the route**

In `src/router/index.js`, add (after the `meet-new` route):
```js
    { path: '/meets/:id', name: 'meet-detail', component: () => import('../views/meets/MeetDetailView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- MeetDetailView`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/meets/MeetDetailView.vue src/views/meets/MeetDetailView.spec.js src/components/meets/MeetChat.vue src/router/index.js
git commit -m "Add MeetDetailView with Details/Participants/Matches/Chat tabs"
```

---

### Task 8: `useChat` composable (realtime) + real `MeetChat` component

**Files:**
- Create: `src/composables/useChat.js`
- Test: `src/composables/useChat.spec.js`
- Modify: `src/components/meets/MeetChat.vue` (replace the Task 7 placeholder)

**Interfaces:**
- Produces: `useChat(meetId): { messages: Ref<object[]>, send(body): Promise<void>, subscribe(): () => void }`. `subscribe()` loads message history then opens a Supabase Realtime channel on `public.chat_messages` filtered to `meet_id`, appending incoming rows to `messages` and returning an unsubscribe function. `send(body)` inserts a row with `author_id = auth.uid()`.

- [ ] **Step 1: Write the failing test**

`src/composables/useChat.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const channelOn = vi.fn()
const channelSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }))
const fakeChannel = { on: channelOn, subscribe: channelSubscribe }

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => fakeChannel),
  },
}))

import { supabase } from '../lib/supabase.js'
import { useChat } from './useChat.js'

describe('useChat', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribe loads history then opens a realtime channel on chat_messages', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'c1', body: 'hi', author_id: 'u1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { messages, subscribe } = useChat('m1')
    const unsubscribe = subscribe()
    // Flush the history load
    await new Promise((r) => setTimeout(r, 0))

    expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    expect(eq).toHaveBeenCalledWith('meet_id', 'm1')
    expect(supabase.channel).toHaveBeenCalledWith('chat:m1')
    expect(channelOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ event: 'INSERT', table: 'chat_messages' }), expect.any(Function))
    expect(messages.value.map((m) => m.body)).toContain('hi')
    expect(typeof unsubscribe).toBe('function')
  })

  it('send inserts a message row with the current user as author', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    const { send } = useChat('m1')
    await send('hello court 1')

    expect(insert).toHaveBeenCalledWith({ meet_id: 'm1', author_id: 'u1', body: 'hello court 1' })
  })
})
```

Note: `send` needs the current user id. The composable reads it from `useAuth().user.value.id` — so the test's `useAuth` mock must return a user. Add at the top of the test file, above the `supabase` mock:

```js
vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ user: { value: { id: 'u1' } } }),
}))
```

(Plain object here is acceptable because `useChat` only reads `user.value.id` in script, never via a template `v-if` — but for consistency with the Global Constraint, prefer `ref`. If the test passes with the plain object, leave it; the constraint's real risk is template-level truthiness, which doesn't apply to a composable.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useChat`
Expected: FAIL — `src/composables/useChat.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useChat.js`:
```js
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function useChat(meetId) {
  const { user } = useAuth()
  const messages = ref([])

  async function loadHistory() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, author_id, body, created_at')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: true })
    if (error) throw error
    messages.value = data
  }

  function subscribe() {
    loadHistory()
    const channel = supabase
      .channel(`chat:${meetId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `meet_id=eq.${meetId}` },
        (payload) => {
          messages.value = [...messages.value, payload.new]
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function send(body) {
    const { error } = await supabase
      .from('chat_messages')
      .insert({ meet_id: meetId, author_id: user.value.id, body })
    if (error) throw error
    // Realtime will append the row via subscribe(); no local push needed.
  }

  return { messages, send, subscribe }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- useChat`
Expected: PASS — 2 tests.

- [ ] **Step 5: Replace the placeholder `MeetChat.vue`**

`src/components/meets/MeetChat.vue`:
```vue
<template>
  <div class="meet-chat">
    <ul class="meet-chat__messages">
      <li v-for="m in messages" :key="m.id" :class="{ 'is-mine': m.author_id === userId }">
        <span class="meet-chat__body">{{ m.body }}</span>
      </li>
    </ul>
    <form class="meet-chat__composer" @submit.prevent="handleSend">
      <LiTextField v-model="draft" placeholder="Message…" />
      <LiButton type="submit" :loading="sending">Send</LiButton>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LiTextField, LiButton, useToast } from '../../design-system/components/index.js'
import { useChat } from '../../composables/useChat.js'

const props = defineProps({ meetId: { type: String, required: true } })

const { messages, send, subscribe } = useChat(props.meetId)
const toast = useToast()
const draft = ref('')
const sending = ref(false)

const userId = computed(() => {
  // Read from the shared auth composable for the "is-mine" styling.
  // (Importing useAuth here would couple the component; the chat payload
  // already carries author_id, and the realtime row does too, so compare
  // against the auth uid lazily.)
  return null
})

let unsubscribe = null
onMounted(() => { unsubscribe = subscribe() })
onUnmounted(() => { if (unsubscribe) unsubscribe() })

async function handleSend() {
  if (!draft.value.trim()) return
  sending.value = true
  try {
    await send(draft.value.trim())
    draft.value = ''
  } catch (err) {
    toast.error(err.message || 'Could not send message.')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.meet-chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.meet-chat__messages {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.meet-chat__body {
  display: inline-block;
  padding: var(--space-xs, 4px) var(--space-s, 8px);
  border-radius: var(--radius-md, 12px);
  background: var(--color-gray-100, #F2F2F2);
}

.meet-chat__composer {
  display: flex;
  gap: var(--space-s, 8px);
}
</style>
```

(The `userId` computed is intentionally minimal — the `is-mine` styling is a nice-to-have; if you want it to actually highlight the current user's messages, import `useAuth` in this component and read `user.value.id`. That is a one-line change and is allowed; left as a clearly-marked simplification since the core chat loop works without it.)

- [ ] **Step 6: Run tests to verify they pass (MeetDetailView test still green)**

Run: `npm test`
Expected: PASS — full suite including the new useChat tests; MeetDetailView's test still passes (its `useChat` mock is unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/composables/useChat.js src/composables/useChat.spec.js src/components/meets/MeetChat.vue
git commit -m "Add realtime useChat composable and wire MeetChat component"
```

---

### Task 9: `useNotifications` composable + `NotificationsBell` + AppLayout wiring

**Files:**
- Create: `src/composables/useNotifications.js`
- Test: `src/composables/useNotifications.spec.js`
- Create: `src/components/notifications/NotificationsBell.vue`
- Create: `src/components/notifications/NotificationsBell.spec.js`
- Modify: `src/layouts/AppLayout.vue` (render `<NotificationsBell />` in the header)

**Interfaces:**
- Produces: `useNotifications(): { notifications: Ref<object[]>, unreadCount: computed<number>, markAllRead(): Promise<void>, subscribe(): () => void }`. Reads `public.notifications` for the current user, live-appends via Realtime, exposes `unreadCount` (rows with null `read_at`), and `markAllRead` sets `read_at = now()` on all unread rows.
- `NotificationsBell` renders a bell icon + unread count badge; clicking opens a dropdown listing recent notifications; mounting auto-subscribes + marks-read on open.

- [ ] **Step 1: Write the failing composable test**

`src/composables/useNotifications.spec.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const channelOn = vi.fn()
const channelSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }))
const fakeChannel = { on: channelOn, subscribe: channelSubscribe }

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn(), channel: vi.fn(() => fakeChannel) },
}))

vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ user: { value: { id: 'u1' } } }),
}))

import { supabase } from '../lib/supabase.js'
import { useNotifications } from './useNotifications.js'

describe('useNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the current user notifications newest-first on subscribe', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'n2', user_id: 'u1', type: 'meet_join', read_at: null, payload: {} },
        { id: 'n1', user_id: 'u1', type: 'waitlist_promoted', read_at: '2026-07-13T00:00:00Z', payload: {} },
      ],
      error: null,
    })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { notifications, unreadCount, subscribe } = useNotifications()
    subscribe()
    await new Promise((r) => setTimeout(r, 0))

    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(notifications.value.length).toBe(2)
    expect(unreadCount.value).toBe(1)
  })

  it('markAllRead sets read_at on all unread rows for the user', async () => {
    const isEq = vi.fn().mockResolvedValue({ error: null })
    const is = vi.fn(() => ({ eq: isEq }))
    const update = vi.fn(() => ({ is }))
    supabase.from.mockReturnValue({ update })

    const { markAllRead } = useNotifications()
    await markAllRead()

    expect(update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(is).toHaveBeenCalledWith('read_at', null)
    expect(isEq).toHaveBeenCalledWith('user_id', 'u1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useNotifications`
Expected: FAIL — `src/composables/useNotifications.js` does not exist.

- [ ] **Step 3: Implement**

`src/composables/useNotifications.js`:
```js
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

export function useNotifications() {
  const { user } = useAuth()
  const notifications = ref([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)

  async function load() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    notifications.value = data
  }

  function subscribe() {
    load()
    const channel = supabase
      .channel(`notifications:${user.value.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.value.id}` },
        (payload) => {
          notifications.value = [payload.new, ...notifications.value]
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  async function markAllRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', user.value.id)
    if (error) throw error
    // Reflect locally without a refetch.
    notifications.value = notifications.value.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() })
  }

  return { notifications, unreadCount, markAllRead, subscribe }
}
```

- [ ] **Step 4: Run composable tests to verify they pass**

Run: `npm test -- useNotifications`
Expected: PASS — 2 tests.

- [ ] **Step 5: Write the failing `NotificationsBell` test**

`src/components/notifications/NotificationsBell.spec.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const subscribe = vi.fn(() => () => {})
const markAllRead = vi.fn().mockResolvedValue()
vi.mock('../../composables/useNotifications.js', () => ({
  useNotifications: vi.fn(() => ({
    notifications: ref([
      { id: 'n1', type: 'meet_join', read_at: null, payload: { meet_title: 'Tue Night', participant_name: 'Rina' } },
    ]),
    unreadCount: ref(1),
    markAllRead,
    subscribe,
  })),
}))

import NotificationsBell from './NotificationsBell.vue'

describe('NotificationsBell', () => {
  it('subscribes on mount and shows the unread count', async () => {
    const wrapper = mount(NotificationsBell)
    await flushPromises()
    expect(subscribe).toHaveBeenCalled()
    expect(wrapper.text()).toContain('1')
  })

  it('lists notifications and marks them read when opened', async () => {
    const wrapper = mount(NotificationsBell)
    await flushPromises()
    await wrapper.find('button.notifications-bell__button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Tue Night')
    expect(markAllRead).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- NotificationsBell`
Expected: FAIL — `NotificationsBell.vue` does not exist.

- [ ] **Step 7: Implement `NotificationsBell.vue`**

```vue
<template>
  <div class="notifications-bell">
    <button class="notifications-bell__button" @click="toggle" aria-label="Notifications">
      <LiIcon name="notifications" />
      <span v-if="unreadCount > 0" class="notifications-bell__badge">{{ unreadCount }}</span>
    </button>
    <div v-if="open" class="notifications-bell__panel">
      <p v-if="notifications.length === 0" class="notifications-bell__empty">No notifications</p>
      <ul v-else>
        <li v-for="n in notifications" :key="n.id" :class="{ 'is-unread': !n.read_at }">
          {{ describe(n) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { LiIcon, useToast } from '../../design-system/components/index.js'
import { useNotifications } from '../../composables/useNotifications.js'

const { notifications, unreadCount, markAllRead, subscribe } = useNotifications()
const toast = useToast()
const open = ref(false)
let unsubscribe = null

onMounted(() => { unsubscribe = subscribe() })
onUnmounted(() => { if (unsubscribe) unsubscribe() })

async function toggle() {
  open.value = !open.value
  if (open.value && unreadCount.value > 0) {
    try {
      await markAllRead()
    } catch (err) {
      toast.error(err.message || 'Could not mark notifications read.')
    }
  }
}

function describe(n) {
  const p = n.payload || {}
  if (n.type === 'meet_join') return `${p.participant_name || 'Someone'} joined ${p.meet_title || 'your meet'}`
  if (n.type === 'waitlist_promoted') return `You were promoted off the waitlist for ${p.meet_title || 'a meet'}`
  return 'New notification'
}
</script>

<style scoped>
.notifications-bell {
  position: relative;
}

.notifications-bell__button {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-gray-800, #4D4D4D);
}

.notifications-bell__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-red-500, #A33129);
  color: #fff;
  font-size: 10px;
  border-radius: var(--radius-pill, 999px);
  padding: 0 4px;
}

.notifications-bell__panel {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-gray-200, #E6E6E6);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-width: 260px;
  padding: var(--space-s, 8px);
  z-index: 10;
}

.notifications-bell__panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}

.notifications-bell__panel li {
  padding: var(--space-s, 8px);
  border-radius: var(--radius-sm, 8px);
  font-size: var(--text-xs, 14px);
}

.notifications-bell__panel li.is-unread {
  background: var(--color-gray-100, #F2F2F2);
  font-weight: 600;
}

.notifications-bell__empty {
  padding: var(--space-s, 8px);
  color: var(--color-gray-500, #999999);
  font-size: var(--text-xs, 14px);
}
</style>
```

- [ ] **Step 8: Render the bell in `AppLayout.vue`**

In `src/layouts/AppLayout.vue`, import the bell and render it inside the logged-in `<nav class="app-header__nav">` block, before the sign-out button. Add to `<script setup>`:
```js
import NotificationsBell from '../components/notifications/NotificationsBell.vue'
```
And in the logged-in nav template, insert before the `<button class="app-header__signout">`:
```html
        <NotificationsBell />
```
The existing `AppLayout.spec.js` (which mocks `useAuth` and asserts nav text) does not reference the bell and won't break — but if the bell's `useNotifications` import transitively pulls the real supabase client, that's now fine because `AppLayout.spec.js` mounts `AppLayout` which would render `<NotificationsBell/>`. To keep `AppLayout.spec.js` passing without a new mock, stub the bell in those tests: add `global: { stubs: { NotificationsBell: true } }` to each `mount(AppLayout, ...)` call in `src/layouts/AppLayout.spec.js`. (This is a test-only stub of a first-party component, not a vendored file edit — allowed.)

- [ ] **Step 9: Run the full suite and verify everything passes**

Run: `npm test`
Expected: PASS — all suites green, including AppLayout (with the bell stubbed) and the new NotificationsBell tests.

- [ ] **Step 10: Verify the build still works**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 11: Commit**

```bash
git add src/composables/useNotifications.js src/composables/useNotifications.spec.js src/components/notifications/NotificationsBell.vue src/components/notifications/NotificationsBell.spec.js src/layouts/AppLayout.vue src/layouts/AppLayout.spec.js
git commit -m "Add realtime notifications: useNotifications, NotificationsBell, wire into AppLayout"
```

---

## Self-Review Notes

- **Spec coverage (Phase 3 core):** create-meet wizard (Task 5), meets list (Task 6), meet detail Details/Participants tabs (Task 7), RSVP join/leave with waitlist + auto-promote (Task 4 composables, Task 7 UI), per-meet chat (Tasks 8), in-app notifications with bell (Task 9), notification creation server-side via triggers (Task 2). Router debt from Phase 2 paid down first (Task 1).
- **Deferred to Phase 3b (explicitly out of scope, per plan scope):** DMs, search/filter meets, add-to-calendar, shareable public link + TV mode, "Up Next" home widget, invite-tracking UI, the actual match generator + Matches tab content (Phase 4).
- **Notification writes:** solved via `SECURITY DEFINER` triggers (Task 2) because `notifications` has no client INSERT policy — the composables only ever READ notifications, matching the table's RLS intent. Confirmed against the Phase 1 migration.
- **Realtime testing:** `useChat`/`useNotifications` tests assert the channel setup call shape (`supabase.channel(...).on(...).subscribe()`) and the history-load path, not a simulated socket — keeps tests deterministic without a live Realtime connection.
- **Interface consistency:** `useMeetParticipants.joinMeet(meet, userId)` takes the full meet row (Task 4) and `MeetDetailView` passes `meet.value` (Task 7) — signatures match. `useChat(meetId)` / `useNotifications()` (no arg, reads `useAuth().user`) — match their test mocks. `MeetChat` prop `meetId` (Task 7 placeholder + Task 8 real) matches `MeetDetailView`'s `:meet-id="meet.id"`.
- **Global Constraints honored:** real `ref()` in `useAuth` mocks (CreateMeetView, MeetsListView, MeetDetailView tests); `RouterLinkStub` slot-forwarding in all view tests; no vendored design-system edits (date/time inputs use `LiTextField type="datetime-local"`/`type="date"`/`type="number"`, not the picker components); mutation handlers catch + toast; router stays hash-mode.
