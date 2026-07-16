# Meet/Match dedupe + Add Player (guest & invite) — Design

## Problem

1. **Duplicate match sessions.** Creating a meet already auto-creates one `match_sessions` row (`CreateMeetView.vue` calls `createMeet()` then `createSession()`). But the Meet Detail "Matches" tab's "+ New match session" / "Open match session" buttons always route to `match-session` without a `sessionId`, which renders `CreateMatchFlow` and inserts *another* session for the same meet every time they're clicked. There's no dedup guard.
2. **No way to add other people to a meet/match.** Only self-service `joinMeet`/`leaveMeet` exist. There's no UI for an organizer to add an already-registered user (e.g. a club member who isn't on the app right now) or a guest who has no account at all — matching what apps like Reclub/Qlutch support.

## Goals

- Organizer opening the Matches tab lands on the existing session instead of accidentally creating a new one.
- Organizer can still deliberately start an additional session for the same meet (multi-round support already implied by the existing sessions list UI).
- Organizer can add an existing club member directly as a confirmed/waitlisted participant.
- Organizer can add a guest (name only, no account) as a participant, and that guest can be assigned into match rounds and played like any other participant.
- Stats/leaderboard/gamification remain unaffected — guests never accumulate personal stats, since they have no account.

## Non-goals

- No "invited, pending accept" flow (no notification/accept-decline system exists today; out of scope to build one).
- No guest accounts, guest login, or guest-to-real-user conversion flow.
- No changes to stats/leaderboard/gamification computation logic.

## Part A — Fix duplicate match session creation

**File:** `src/views/meets/MeetDetailView.vue`

Change `goToMatches()`:
- If `sessions.value.length > 0`: navigate directly to the most recent session (`sessions.value[0]`, already sorted `created_at desc` by `listSessionsByMeet`) via the existing `openSession(id)` path — no wizard.
- If `sessions.value.length === 0` (legacy meets predating auto-create, or the auto-create insert silently failed): navigate to `match-session` with no `sessionId`, which still renders the create wizard, same as today.

UI tweaks in the Matches tab:
- Primary button label becomes conditional: "Open match session" when a session exists, "+ New match session" when none exists.
- A separate, visually secondary action "+ Start another session" is added (only when `sessions.length > 0`) that explicitly goes through the create wizard — for organizers who intentionally want a second round/session for the same meet. This preserves the existing multi-session-per-meet capability without it being the accidental default path.

No database or composable changes needed for Part A.

## Part B — Add player (existing user or guest)

### Data model (new migration `supabase/migrations/<timestamp>_meet_guest_players.sql`)

```sql
-- meet_participants: allow guest rows (no account)
alter table public.meet_participants
  alter column user_id drop not null,
  add column guest_name text,
  add constraint meet_participants_identity_check
    check ((user_id is not null) <> (guest_name is not null));

-- match_players: allow guest rows, referencing the meet_participants row
alter table public.match_players drop constraint match_players_pkey;
alter table public.match_players
  add column id uuid primary key default gen_random_uuid(),
  alter column user_id drop not null,
  add column guest_participant_id uuid references public.meet_participants(id) on delete cascade,
  add constraint match_players_identity_check
    check ((user_id is not null) <> (guest_participant_id is not null)),
  add constraint match_players_match_user_unique unique (match_id, user_id),
  add constraint match_players_match_guest_unique unique (match_id, guest_participant_id);
```

Notes:
- Postgres unique constraints ignore rows where the constrained column is `NULL`, so `match_players_match_user_unique`/`..._guest_unique` naturally allow one real row + one guest row to coexist per match without needing partial indexes.
- Same reasoning covers `meet_participants`' existing `unique (meet_id, user_id)` — multiple guest rows (`user_id null`) for the same meet don't collide.
- **No RLS policy changes needed.** Verified existing policies are already permissive enough:
  - `meet_participants_insert_self_or_organizer`: `user_id = auth.uid() OR meets.creator_id = auth.uid()` — organizer inserting a guest row (`user_id` null) satisfies the second branch.
  - `enforce_meet_capacity()` trigger and `promote_next_meet_participant()` RPC only count/compare `status`, never reference `user_id` — capacity/waitlist logic works unchanged for guest rows.
  - `match_players_manage_organizer`: keyed on `matches → match_rounds → match_sessions → meets.creator_id`, never references `user_id` — organizer inserting guest rows into `match_players` already passes.

### Composables

**`src/composables/useMeetParticipants.js`**
- `addExistingMember(meet, userId, addedBy)`: mirrors `joinMeet`'s capacity logic (confirmed vs waitlisted) but inserts for an arbitrary `userId` chosen by the organizer, with `invited_by: addedBy`.
- `addGuest(meet, guestName, addedBy)`: same capacity logic, inserts `{ meet_id, guest_name: guestName, role: 'player', status, invited_by: addedBy }` (`user_id` omitted/null).
- `listClubMembersNotInMeet(meetId, clubId)`: queries `club_members` for the meet's club, excluding profiles already present in `meet_participants` for that meet — backs the "pick from club members" picker.

**`src/composables/useMatchRounds.js`**
- `generateRound(session, input, roundIndex, participantsById)`: unchanged generator call (still receives opaque `playerIds`/`teams`), but the persistence step now takes a `participantsById` lookup (keyed by `meet_participants.id`) to decide, per player id in the generated round, whether to write `user_id` or `guest_participant_id` into `match_players`.
- `listRoundsWithMatches` additionally selects `guest_participant_id` on `match_players` and returns `team_a`/`team_b` as the participant id (not raw `user_id`) so the view can resolve names uniformly.

### Views

**`src/views/matches/MatchSessionView.vue`**
- `playerIds` becomes `participants.value.map(p => p.id)` (the `meet_participants.id`) instead of `p.user_id`.
- `playerById` map is built from `participants.value` keyed by `p.id`, with display data `{ full_name: p.profiles?.full_name ?? p.guest_name, avatar_url: p.profiles?.avatar_url ?? null }`.
- `name()`/`avatar()`/`initials()` continue to take the same `pid` param, now resolving against the participant-id-keyed map; guests render initials only (no avatar), same as a real user with no `avatar_url`.

**`src/views/meets/MeetDetailView.vue`** (Participants tab)
- "+ Add player" button, organizer-only (`v-if="isOrganizer"`), opens a bottom sheet with two sections:
  - Club members not yet in the meet (from `listClubMembersNotInMeet`), tap to add via `addExistingMember`.
  - Text field + "Add guest" button, calls `addGuest`.
- Guest rows in the participant list show a "Guest" badge in place of the status badge (their status still drives capacity, but "invited"/"declined" states don't apply since guests can't act on their own row — organizer can still remove them via existing `leaveMeet`-equivalent delete, reusing organizer branch of `meet_participants_delete_self_or_organizer`).

## Error handling / edge cases

- Adding a club member/guest when the meet is already at capacity: same silent-waitlist fallback as `joinMeet` (capacity trigger raises, caller catches and re-inserts as `waitlisted`).
- Removing a guest participant (deleting their `meet_participants` row) cascades via `on delete cascade` on the new `guest_participant_id` FK, cleaning up any `match_players` rows they were assigned to. Note this is *not* symmetric with real users today: `match_players.user_id` cascades from `profiles(id)`, not from `meet_participants`, so removing a real user from a meet does not retroactively clean up their existing `match_players` rows. That gap already exists for real users and is out of scope to fix here — guests simply don't inherit it, since their only path into `match_players` is through `meet_participants`.
- Empty/duplicate guest names are allowed (no uniqueness constraint on `guest_name`) — same person could be added twice under two rows if the organizer fat-fingers it; acceptable, matches how two real users are just two distinct rows too.

## Testing

- `useMeetParticipants.spec.js`: add cases for `addExistingMember` (confirmed + waitlist-fallback paths), `addGuest` (same paths), `listClubMembersNotInMeet` (excludes existing participants).
- `useMatchRounds.spec.js`: add a case with a mixed roster (real user + guest) asserting `match_players` rows get `user_id` for the real player and `guest_participant_id` for the guest.
- `MatchSessionView.spec.js`: assert a guest participant renders with `guest_name` and initials-only avatar.
- `MeetDetailView.spec.js`: assert `goToMatches()` opens the existing session when one exists, and only falls through to the create wizard when the session list is empty.

## Out of scope

- Building an accept/decline notification flow for invited-but-not-yet-confirmed participants.
- Retroactive cleanup of orphaned `match_players` rows when a real user leaves a meet (pre-existing gap, unrelated to this change).
- Any Edge Function / service-role based "shadow account" creation for guests.
