# Phase 5 — Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manual proof-of-payment flow for meet fees + itemized/split expenses, with organizer confirm/reject and a one-tap reminder.

**Architecture:** Supabase Storage holds proof images; a `payments` row is the settle-up record (pending → confirmed/rejected). Expense splits are computed client-side and written as `meet_expense_shares`. Confirm/reject + reminder go through SECURITY DEFINER RPCs (notifications has no insert policy; the existing payments update policy would let participants self-confirm, so it is tightened to organizer-only and status changes move behind an RPC). A `PaymentsPanel` (participant upload + organizer review) and `ExpensesPanel` (organizer split config) plug into MeetDetailView as a new tab.

**Tech Stack:** Vue 3 Composition API, Vite, Supabase (Postgres + Storage + RPC + RLS), Vitest + @vue/test-utils.

## Global Constraints

- Vue 3 `<script setup>`, Vite, Vue Router hash mode (`createWebHashHistory`).
- Supabase anon key is public in the static build — RLS + SECURITY DEFINER checks are the real security boundary.
- NEVER edit files under `src/design-system/` (vendored Lithium `Li*` components). `LiButton` renders `<button>`; `LiTabs` expects `[{label}]`; `useToast()` works standalone in tests.
- `v-model.number` is a no-op on vendored `LiTextField` — use native `<input type="number">` for numeric fields and `Number()`-coerce in handlers.
- Tests use real `ref()` for `useAuth().user`, slot-forwarding `RouterLinkStub`, and chainable Supabase mock builders (see `src/composables/useFeed.spec.js` for the canonical mock shape).
- Mutation handlers catch + `toast.error(err.message || '…')`.
- Migrations pushed via `npx supabase db push` (controller-run when the classifier denies). Git push to origin is NOT done unless the user asks.
- Work directly on `main`.

## File Structure

- `supabase/migrations/20260713200000_phase5_payment_proofs_bucket.sql` — new `payment-proofs` Storage bucket + RLS (public read, insert own, delete own).
- `supabase/migrations/20260713203000_phase5_payment_rpc.sql` — tighten `payments` update policy to organizer-only; add `confirm_payment` + `send_payment_reminder` SECURITY DEFINER RPCs.
- `src/composables/useStorage.js` — add `uploadPaymentProof(file)`.
- `src/composables/useStorage.spec.js` — add uploadPaymentProof test.
- `src/composables/useExpenses.js` — NEW: addExpense (equal/custom split → meet_expense_shares), listExpensesWithShares, deleteExpense.
- `src/composables/useExpenses.spec.js` — NEW.
- `src/composables/usePayments.js` — NEW: createPayment, listPaymentsForMeet, confirmPayment, rejectPayment, remindUser, listMyPayments.
- `src/composables/usePayments.spec.js` — NEW.
- `src/components/payments/ExpensesPanel.vue` — NEW: organizer add-expense form + shares list.
- `src/components/payments/ExpensesPanel.spec.js` — NEW.
- `src/components/payments/PaymentsPanel.vue` — NEW: participant upload-proof + organizer outstanding-balance/confirm/reject/remind.
- `src/components/payments/PaymentsPanel.spec.js` — NEW.
- `src/views/meets/MeetDetailView.vue` — add a "Payments" tab rendering ExpensesPanel + PaymentsPanel.

---

### Task 1: payment-proofs Storage bucket + useStorage.uploadPaymentProof

**Files:**
- Create: `supabase/migrations/20260713200000_phase5_payment_proofs_bucket.sql`
- Modify: `src/composables/useStorage.js`
- Test: `src/composables/useStorage.spec.js`

**Interfaces:**
- Produces: `useStorage().uploadPaymentProof(file: File) => Promise<string>` (public URL). Mirrors `uploadFeedMedia` but targets the `payment-proofs` bucket.

- [ ] **Step 1: Write the bucket migration**

Create `supabase/migrations/20260713200000_phase5_payment_proofs_bucket.sql`:

```sql
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

create policy "payment_proofs_select_public" on storage.objects
  for select using (bucket_id = 'payment-proofs');

create policy "payment_proofs_insert_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'payment-proofs' and owner = auth.uid());

create policy "payment_proofs_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'payment-proofs' and owner = auth.uid());
```

- [ ] **Step 2: Add uploadPaymentProof to useStorage.js**

Append to `src/composables/useStorage.js` (keep `uploadFeedMedia` as-is):

```js
  async function uploadPaymentProof(file) {
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
    return data.publicUrl
  }

  return { uploadFeedMedia, uploadPaymentProof }
}
```

- [ ] **Step 3: Add the failing test**

Append to `src/composables/useStorage.spec.js`:

```js
  it('uploadPaymentProof uploads to the payment-proofs bucket and returns the public URL', async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.org/payment-proofs/abc.png' } })
    vi.doMock('../../lib/supabase.js', () => ({ supabase: { storage: { from: () => ({ upload, getPublicUrl }) } } }))
    const { useStorage } = await import('../../composables/useStorage.js')
    const { uploadPaymentProof } = useStorage()
    const url = await uploadPaymentProof({ name: 'proof.png' })
    expect(upload).toHaveBeenCalled()
    expect(getPublicUrl).toHaveBeenCalled()
    expect(url).toBe('https://example.org/payment-proofs/abc.png')
  })
```

If `useStorage.spec.js` already imports `useStorage` at top-level with a `vi.mock`, match the existing mock style instead of `vi.doMock` — the canonical pattern lives in `src/composables/useFeed.spec.js`. The test must assert `upload` was called with a path ending in `.png` and that the returned URL is the public URL from `getPublicUrl`.

- [ ] **Step 4: Run the test**

Run: `npm test -- src/composables/useStorage.spec.js`
Expected: PASS (existing tests + new test green).

- [ ] **Step 5: Push the migration**

Run: `npx supabase db push` (controller-run if denied). Verify with `npx supabase migration list` that `20260713200000` is applied on remote.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260713200000_phase5_payment_proofs_bucket.sql src/composables/useStorage.js src/composables/useStorage.spec.js
git commit -m "feat(p5): payment-proofs bucket + uploadPaymentProof"
```

---

### Task 2: useExpenses composable (split expenses + shares)

**Files:**
- Create: `src/composables/useExpenses.js`
- Test: `src/composables/useExpenses.spec.js`

**Interfaces:**
- Consumes: `supabase` from `../lib/supabase.js`. Meet participants come from `useMeetParticipants` (caller passes the user-id list in).
- Produces:
  - `addExpense(meetId, { label, totalAmount, splitMethod, participantIds, customShares? }) => Promise<expense>` — `splitMethod` is `'equal'` or `'custom'`. For equal, each share = `round(totalAmount / n, 2)` (last share absorbs rounding so the sum equals `totalAmount`). For custom, `customShares` is `[{userId, amountOwed}]`. Inserts the `meet_expenses` row, then batch-inserts `meet_expense_shares`. Returns the expense row.
  - `listExpensesWithShares(meetId) => Promise<expense[]>` — each expense has `shares: [{ id, user_id, amount_owed, user: { id, full_name } }]`.
  - `deleteExpense(id) => Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/composables/useExpenses.spec.js`. Use the chainable-builder mock pattern from `useFeed.spec.js`. The mock must support `.insert(...).select()` (returns single row for the expense) and `.insert(array)` (batch shares, returns null), `.eq().order()` for list, `.eq().delete()` for delete.

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

function chain(overrides = {}) {
  const c = {
    select: vi.fn(() => c),
    insert: vi.fn(() => c),
    values: vi.fn(() => c),
    eq: vi.fn(() => c),
    order: vi.fn(() => c),
    delete: vi.fn(() => c),
    single: vi.fn(() => c),
    then: (resolve) => resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
  }
  return c
}

vi.mock('../../lib/supabase.js', () => {
  const builders = {}
  return {
    supabase: {
      from: vi.fn((table) => {
        builders[table] = builders[table] ?? chain()
        return builders[table]
      }),
    },
    __builders: builders,
    chain,
  }
})

import { useExpenses } from './useExpenses.js'
import { supabase, __builders, chain } from '../../lib/supabase.js'

describe('useExpenses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('addExpense equal-split computes per-participant shares that sum to totalAmount', async () => {
    const expenseRow = { id: 'e1', meet_id: 'm1', label: 'Court', total_amount: 30, split_method: 'equal' }
    // meet_expenses insert -> .select().single() -> expenseRow
    __builders.meet_expenses = chain({ data: expenseRow })
    // shares insert (batch) -> no select -> { data: null, error: null }
    __builders.meet_expense_shares = chain({ data: null, error: null })

    const { addExpense } = useExpenses()
    const result = await addExpense('m1', { label: 'Court', totalAmount: 30, splitMethod: 'equal', participantIds: ['u1', 'u2', 'u3'] })

    expect(result).toEqual(expenseRow)
    const sharesCall = __builders.meet_expense_shares.insert.mock.calls[0][0]
    const sum = sharesCall.reduce((s, r) => s + Number(r.amount_owed), 0)
    expect(sum).toBe(30)
    expect(sharesCall).toHaveLength(3)
    expect(sharesCall[0]).toMatchObject({ meet_expense_id: 'e1', user_id: 'u1' })
  })

  it('addExpense custom-split uses the provided customShares', async () => {
    __builders.meet_expenses = chain({ data: { id: 'e2' } })
    __builders.meet_expense_shares = chain({ data: null, error: null })
    const { addExpense } = useExpenses()
    await addExpense('m1', {
      label: 'Balls', totalAmount: 20, splitMethod: 'custom', participantIds: ['u1', 'u2'],
      customShares: [{ userId: 'u1', amountOwed: 15 }, { userId: 'u2', amountOwed: 5 }],
    })
    const sharesCall = __builders.meet_expense_shares.insert.mock.calls[0][0]
    expect(sharesCall).toEqual([
      { meet_expense_id: 'e2', user_id: 'u1', amount_owed: 15 },
      { meet_expense_id: 'e2', user_id: 'u2', amount_owed: 5 },
    ])
  })

  it('listExpensesWithShares embeds shares with profiles', async () => {
    __builders.meet_expenses = chain({ data: [{ id: 'e1', shares: [{ user_id: 'u1', amount_owed: 10, user: { id: 'u1', full_name: 'A' } }] }] })
    const { listExpensesWithShares } = useExpenses()
    const rows = await listExpensesWithShares('m1')
    expect(rows[0].shares[0].user.full_name).toBe('A')
    expect(supabase.from).toHaveBeenCalledWith('meet_expenses')
  })

  it('deleteExpense deletes by id', async () => {
    __builders.meet_expenses = chain({ data: null, error: null })
    const { deleteExpense } = useExpenses()
    await deleteExpense('e1')
    expect(__builders.meet_expenses.eq).toHaveBeenCalledWith('id', 'e1')
    expect(__builders.meet_expenses.delete).toHaveBeenCalled()
  })

  it('throws on error', async () => {
    __builders.meet_expenses = chain({ data: null, error: { message: 'boom' } })
    const { addExpense } = useExpenses()
    await expect(addExpense('m1', { label: 'x', totalAmount: 10, splitMethod: 'equal', participantIds: ['u1', 'u2'] })).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/composables/useExpenses.spec.js`
Expected: FAIL (module `./useExpenses.js` not found).

- [ ] **Step 3: Write the implementation**

Create `src/composables/useExpenses.js`:

```js
import { supabase } from '../lib/supabase.js'

function equalShares(totalAmount, participantIds) {
  const n = participantIds.length
  if (n === 0) return []
  const base = Math.floor((totalAmount / n) * 100) / 100
  const shares = participantIds.map((userId) => ({ user_id: userId, amount_owed: base }))
  // Absorb rounding into the last share so the sum equals totalAmount exactly.
  const sum = base * n
  const remainder = Math.round((totalAmount - sum) * 100) / 100
  shares[shares.length - 1].amount_owed = Math.round((base + remainder) * 100) / 100
  return shares
}

export function useExpenses() {
  async function addExpense(meetId, { label, totalAmount, splitMethod, participantIds, customShares }) {
    const { data: expense, error } = await supabase
      .from('meet_expenses')
      .insert({ meet_id: meetId, label, total_amount: totalAmount, split_method: splitMethod })
      .select()
      .single()
    if (error) throw error

    const rows = splitMethod === 'custom'
      ? (customShares || []).map((s) => ({ meet_expense_id: expense.id, user_id: s.userId, amount_owed: s.amountOwed }))
      : equalShares(Number(totalAmount), participantIds).map((s) => ({ meet_expense_id: expense.id, ...s }))

    const { error: shareError } = await supabase.from('meet_expense_shares').insert(rows)
    if (shareError) throw shareError
    return expense
  }

  async function listExpensesWithShares(meetId) {
    const { data, error } = await supabase
      .from('meet_expenses')
      .select('id, label, total_amount, split_method, shares:meet_expense_shares(id, user_id, amount_owed, user:profiles(id, full_name))')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('meet_expenses').delete().eq('id', id)
    if (error) throw error
  }

  return { addExpense, listExpensesWithShares, deleteExpense }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/composables/useExpenses.spec.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useExpenses.js src/composables/useExpenses.spec.js
git commit -m "feat(p5): useExpenses composable — split expenses + shares"
```

---

### Task 3: Phase 5 migration — tighten payments update policy + confirm_payment + send_payment_reminder RPCs

**Files:**
- Create: `supabase/migrations/20260713203000_phase5_payment_rpc.sql`

**Interfaces:**
- Produces:
  - `payments` update is now organizer-only (meet creator OR competition club organizer). Participants can no longer update their own payment row (re-upload = insert a new row; acceptable V1).
  - `confirm_payment(p_payment_id uuid, p_status text)` — `p_status` ∈ `{ 'confirmed', 'rejected' }`. Verifies the caller is the meet organizer (meet_id path) or a club owner/organizer of the competition's club (competition_id path). Sets `status`, `confirmed_by = auth.uid()`, `confirmed_at = now()` (confirmed_at only when confirmed). Idempotent: no-op if already in the requested terminal status. Raises `exception` if not the organizer. Returns the updated `payments` row.
  - `send_payment_reminder(p_payment_id uuid)` — verifies organizer (same check). Inserts a `notifications` row for the payer: `type = 'payment_reminder'`, `payload = { "meet_id": ..., "amount": ... }`. Returns `void`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260713203000_phase5_payment_rpc.sql`:

```sql
-- Tighten payments update: participants could previously self-confirm via the
-- own-or-organizer policy. Status changes now go through confirm_payment (which
-- does its own organizer check under SECURITY DEFINER). Participants may still
-- INSERT their own payment (payments_insert_own) but cannot UPDATE it.
drop policy if exists "payments_update_own_or_organizer" on public.payments;

create policy "payments_update_organizer" on public.payments
  for update to authenticated using (
    exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
    or exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = payments.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

-- confirm_payment: organizer-only status change. SECURITY DEFINER bypasses the
-- matches/payments RLS, so the organizer check is explicit. Idempotent.
create or replace function public.confirm_payment(p_payment_id uuid, p_status text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
  v_is_organizer boolean := false;
begin
  select * into v_row from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found';
  end if;

  if v_row.meet_id is not null then
    select exists(
      select 1 from public.meets m where m.id = v_row.meet_id and m.creator_id = auth.uid()
    ) into v_is_organizer;
  elsif v_row.competition_id is not null then
    select exists(
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = v_row.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    ) into v_is_organizer;
  end if;

  if not v_is_organizer then
    raise exception 'only the organizer can confirm or reject a payment';
  end if;

  if p_status not in ('confirmed','rejected') then
    raise exception 'p_status must be confirmed or rejected';
  end if;

  -- Idempotent: no-op if already in the requested status.
  if v_row.status = p_status then
    return v_row;
  end if;

  update public.payments
    set status = p_status,
        confirmed_by = auth.uid(),
        confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end
    where id = p_payment_id
    returning * into v_row;

  return v_row;
end;
$$;

-- send_payment_reminder: organizer-only. Inserts a notification for the payer.
-- notifications has no insert RLS policy, so this RPC is the only client path.
create or replace function public.send_payment_reminder(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
  v_is_organizer boolean := false;
begin
  select * into v_row from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found';
  end if;

  if v_row.meet_id is not null then
    select exists(
      select 1 from public.meets m where m.id = v_row.meet_id and m.creator_id = auth.uid()
    ) into v_is_organizer;
  elsif v_row.competition_id is not null then
    select exists(
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = v_row.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    ) into v_is_organizer;
  end if;

  if not v_is_organizer then
    raise exception 'only the organizer can send a payment reminder';
  end if;

  insert into public.notifications (user_id, type, payload)
  values (v_row.user_id, 'payment_reminder', jsonb_build_object(
    'meet_id', v_row.meet_id,
    'competition_id', v_row.competition_id,
    'amount', v_row.amount
  ));
end;
$$;

grant execute on function public.confirm_payment(uuid, text) to authenticated;
grant execute on function public.send_payment_reminder(uuid) to authenticated;
```

- [ ] **Step 2: Push the migration**

Run: `npx supabase db push` (controller-run if denied).
Verify: `npx supabase migration list` shows `20260713203000` applied on remote.

- [ ] **Step 3: Sanity-check the RPCs remotely (optional, controller-run)**

If a quick check is feasible, run via the Supabase SQL editor or `supabase functions` — not required for the task gate (the RPCs are exercised through `usePayments` tests with mocked `rpc`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260713203000_phase5_payment_rpc.sql
git commit -m "feat(p5): organizer-only payment confirm/reject + reminder RPCs"
```

---

### Task 4: usePayments composable

**Files:**
- Create: `src/composables/usePayments.js`
- Test: `src/composables/usePayments.spec.js`

**Interfaces:**
- Consumes: `supabase` from `../lib/supabase.js`. The RPCs `confirm_payment` + `send_payment_reminder` from Task 3.
- Produces:
  - `createPayment({ meetId?, competitionId?, expenseShareId?, amount, proofUrl }, userId) => Promise<payment>` — inserts a `pending` row with `user_id = userId`, `status = 'pending'`. Returns the inserted row via `.select().single()`.
  - `listPaymentsForMeet(meetId) => Promise<payment[]>` — embeds `user:profiles(id, full_name, avatar_url)` and `expense_share:meet_expense_shares(id, amount_owed, user:profiles(id, full_name))`, ordered by `created_at desc`.
  - `confirmPayment(paymentId) => Promise<void>` → `rpc('confirm_payment', { p_payment_id, p_status: 'confirmed' })`. Throws on error.
  - `rejectPayment(paymentId) => Promise<void>` → `rpc('confirm_payment', { p_payment_id, p_status: 'rejected' })`.
  - `remindUser(paymentId) => Promise<void>` → `rpc('send_payment_reminder', { p_payment_id })`.
  - `listMyPayments(userId) => Promise<payment[]>` — `user_id = userId`, ordered by `created_at desc`.

- [ ] **Step 1: Write the failing test**

Create `src/composables/usePayments.spec.js`. The mock builder must support `.from().insert().select().single()` (create), `.from().select().eq().order()` (list), and `.rpc(name, args)` (confirm/reject/remind). Use the chainable-builder pattern from `useExpenses.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

function chain(overrides = {}) {
  const c = {
    select: vi.fn(() => c),
    insert: vi.fn(() => c),
    eq: vi.fn(() => c),
    order: vi.fn(() => c),
    single: vi.fn(() => c),
    then: (resolve) => resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
  }
  return c
}

const rpc = vi.fn()
const builders = {}
vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table) => {
      builders[table] = builders[table] ?? chain()
      return builders[table]
    }),
    rpc,
  },
}))

import { usePayments } from './usePayments.js'

describe('usePayments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createPayment inserts a pending row with user_id + returns it', async () => {
    builders.payments = chain({ data: { id: 'p1', status: 'pending' } })
    const { createPayment } = usePayments()
    const row = await createPayment({ meetId: 'm1', amount: 10, proofUrl: 'https://x/p.png' }, 'u1')
    expect(builders.payments.insert).toHaveBeenCalledWith({
      meet_id: 'm1',
      competition_id: null,
      expense_share_id: null,
      user_id: 'u1',
      amount: 10,
      proof_url: 'https://x/p.png',
      status: 'pending',
    })
    expect(row).toEqual({ id: 'p1', status: 'pending' })
  })

  it('listPaymentsForMeet embeds user + expense_share', async () => {
    builders.payments = chain({ data: [{ id: 'p1', user: { full_name: 'A' }, expense_share: { amount_owed: 10 } }] })
    const { listPaymentsForMeet } = usePayments()
    const rows = await listPaymentsForMeet('m1')
    expect(rows[0].user.full_name).toBe('A')
    expect(builders.payments.eq).toHaveBeenCalledWith('meet_id', 'm1')
  })

  it('confirmPayment calls the confirm_payment RPC with status=confirmed', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const { confirmPayment } = usePayments()
    await confirmPayment('p1')
    expect(rpc).toHaveBeenCalledWith('confirm_payment', { p_payment_id: 'p1', p_status: 'confirmed' })
  })

  it('rejectPayment calls the confirm_payment RPC with status=rejected', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const { rejectPayment } = usePayments()
    await rejectPayment('p1')
    expect(rpc).toHaveBeenCalledWith('confirm_payment', { p_payment_id: 'p1', p_status: 'rejected' })
  })

  it('remindUser calls the send_payment_reminder RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const { remindUser } = usePayments()
    await remindUser('p1')
    expect(rpc).toHaveBeenCalledWith('send_payment_reminder', { p_payment_id: 'p1' })
  })

  it('throws when the RPC returns an error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not organizer' } })
    const { confirmPayment } = usePayments()
    await expect(confirmPayment('p1')).rejects.toThrow('not organizer')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/composables/usePayments.spec.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

Create `src/composables/usePayments.js`:

```js
import { supabase } from '../lib/supabase.js'

export function usePayments() {
  async function createPayment({ meetId, competitionId, expenseShareId, amount, proofUrl }, userId) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        meet_id: meetId ?? null,
        competition_id: competitionId ?? null,
        expense_share_id: expenseShareId ?? null,
        user_id: userId,
        amount,
        proof_url: proofUrl,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function listPaymentsForMeet(meetId) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, meet_id, competition_id, expense_share_id, user_id, amount, proof_url, status, confirmed_at, created_at, user:profiles(id, full_name, avatar_url), expense_share:meet_expense_shares(id, amount_owed, user:profiles(id, full_name))')
      .eq('meet_id', meetId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function listMyPayments(userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, meet_id, competition_id, amount, proof_url, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function confirmPayment(paymentId) {
    const { error } = await supabase.rpc('confirm_payment', { p_payment_id: paymentId, p_status: 'confirmed' })
    if (error) throw error
  }

  async function rejectPayment(paymentId) {
    const { error } = await supabase.rpc('confirm_payment', { p_payment_id: paymentId, p_status: 'rejected' })
    if (error) throw error
  }

  async function remindUser(paymentId) {
    const { error } = await supabase.rpc('send_payment_reminder', { p_payment_id: paymentId })
    if (error) throw error
  }

  return { createPayment, listPaymentsForMeet, listMyPayments, confirmPayment, rejectPayment, remindUser }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/composables/usePayments.spec.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePayments.js src/composables/usePayments.spec.js
git commit -m "feat(p5): usePayments composable — create/confirm/reject/remind"
```

---

### Task 5: ExpensesPanel + PaymentsPanel components

**Files:**
- Create: `src/components/payments/ExpensesPanel.vue`
- Test: `src/components/payments/ExpensesPanel.spec.js`
- Create: `src/components/payments/PaymentsPanel.vue`
- Test: `src/components/payments/PaymentsPanel.spec.js`

**Interfaces:**
- Consumes:
  - `useAuth` (current user id + organizer flag).
  - `useExpenses` (Task 2): `addExpense`, `listExpensesWithShares`, `deleteExpense`.
  - `usePayments` (Task 4): `createPayment`, `listPaymentsForMeet`, `confirmPayment`, `rejectPayment`, `remindUser`.
  - `useStorage` (Task 1): `uploadPaymentProof`.
  - `useMeetParticipants` (Phase 3): `listParticipants(meetId)` → `[{ user_id, profiles: { full_name } }]` (for the participant picker + outstanding-balance names).
  - `useToast`.
- Props: both components take `meetId: String` and `isOrganizer: Boolean`.
- `ExpensesPanel`: organizer-only. Add-expense form (label, total amount, split method select, equal uses all participants, custom shows per-participant amount inputs). Lists expenses with each share (`name — Rp amount`). Delete button per expense.
- `PaymentsPanel`: 
  - Participant view (not organizer): if `meet.fee_amount > 0` or there are expense shares owed by the current user, show a file picker + "Upload proof" button → `uploadPaymentProof` → `createPayment({ meetId, amount, proofUrl })` (or `expenseShareId` for a share). Shows the user's own payments + statuses.
  - Organizer view: outstanding-balance list — one row per participant with their owed total + paid total + status, and per-payment confirm/reject/remind buttons.

- [ ] **Step 1: Write the ExpensesPanel failing test**

Create `src/components/payments/ExpensesPanel.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u-org' }) })) }))

const addExpense = vi.fn().mockResolvedValue({ id: 'e1' })
const listExpensesWithShares = vi.fn().mockResolvedValue([
  { id: 'e1', label: 'Court', total_amount: 30, split_method: 'equal', shares: [{ user_id: 'u1', amount_owed: 10, user: { full_name: 'A' } }] },
])
const deleteExpense = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/useExpenses.js', () => ({ useExpenses: vi.fn(() => ({ addExpense, listExpensesWithShares, deleteExpense })) }))

const listParticipants = vi.fn().mockResolvedValue([{ user_id: 'u1', profiles: { full_name: 'A' } }, { user_id: 'u2', profiles: { full_name: 'B' } }])
vi.mock('../../composables/useMeetParticipants.js', () => ({ useMeetParticipants: vi.fn(() => ({ listParticipants })) }))

vi.mock('../../composables/useStorage.js', () => ({ useStorage: vi.fn(() => ({ uploadPaymentProof: vi.fn() })) }))

import ExpensesPanel from './ExpensesPanel.vue'

describe('ExpensesPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads expenses + participants on mount and lists a share', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: true } })
    await flushPromises()
    expect(listExpensesWithShares).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Court')
    expect(wrapper.text()).toContain('A')
  })

  it('submits an equal-split expense from the form', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: true } })
    await flushPromises()
    await wrapper.find('[data-testid="expense-label"]').setValue('Balls')
    await wrapper.find('[data-testid="expense-total"]').setValue('20')
    await wrapper.find('[data-testid="expense-submit"]').trigger('click')
    await flushPromises()
    expect(addExpense).toHaveBeenCalled()
    const args = addExpense.mock.calls[0]
    expect(args[0]).toBe('m1')
    expect(args[1].label).toBe('Balls')
    expect(args[1].totalAmount).toBe(20)
    expect(args[1].splitMethod).toBe('equal')
  })

  it('hides the form for non-organizers', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: false } })
    await flushPromises()
    expect(wrapper.find('[data-testid="expense-submit"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/payments/ExpensesPanel.spec.js`
Expected: FAIL (component not found).

- [ ] **Step 3: Write ExpensesPanel.vue**

Create `src/components/payments/ExpensesPanel.vue`:

```vue
<template>
  <section class="expenses-panel">
    <h3>Expenses</h3>

    <form v-if="isOrganizer" class="expenses-panel__form" @submit.prevent="handleAdd">
      <label class="expenses-panel__field">
        Label
        <input data-testid="expense-label" type="text" v-model="form.label" placeholder="Court fee" />
      </label>
      <label class="expenses-panel__field">
        Total
        <input data-testid="expense-total" type="number" min="0" v-model.number="form.totalAmount" />
      </label>
      <label class="expenses-panel__field">
        Split
        <select v-model="form.splitMethod">
          <option value="equal">Equal</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <div v-if="form.splitMethod === 'custom'" class="expenses-panel__custom">
        <label v-for="p in participants" :key="p.user_id">
          {{ p.profiles.full_name }}
          <input type="number" min="0" v-model.number="customAmounts[p.user_id]" />
        </label>
      </div>
      <LiButton data-testid="expense-submit" :loading="saving" type="submit">Add expense</LiButton>
    </form>

    <ul class="expenses-panel__list">
      <li v-for="e in expenses" :key="e.id" class="expenses-panel__expense">
        <div class="expenses-panel__expense-head">
          <strong>{{ e.label }}</strong>
          <span>Rp{{ Number(e.total_amount).toLocaleString('id-ID') }} ({{ e.split_method }})</span>
          <LiButton v-if="isOrganizer" size="sm" variant="ghost" @click="handleDelete(e.id)">Delete</LiButton>
        </div>
        <ul class="expenses-panel__shares">
          <li v-for="s in e.shares" :key="s.user_id">
            {{ s.user?.full_name }} — Rp{{ Number(s.amount_owed).toLocaleString('id-ID') }}
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { LiButton, useToast } from '../../design-system/components/index.js'
import { useExpenses } from '../../composables/useExpenses.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const props = defineProps({ meetId: { type: String, required: true }, isOrganizer: { type: Boolean, default: false } })
const toast = useToast()
const { addExpense, listExpensesWithShares, deleteExpense } = useExpenses()
const { listParticipants } = useMeetParticipants()

const expenses = ref([])
const participants = ref([])
const saving = ref(false)
const form = reactive({ label: '', totalAmount: 0, splitMethod: 'equal' })
const customAmounts = reactive({})

async function reload() {
  expenses.value = await listExpensesWithShares(props.meetId)
}

onMounted(async () => {
  try {
    await reload()
    if (props.isOrganizer) participants.value = await listParticipants(props.meetId)
  } catch (err) {
    toast.error(err.message || 'Could not load expenses.')
  }
})

async function handleAdd() {
  saving.value = true
  try {
    const payload = {
      label: form.label,
      totalAmount: Number(form.totalAmount) || 0,
      splitMethod: form.splitMethod,
      participantIds: participants.value.map((p) => p.user_id),
    }
    if (form.splitMethod === 'custom') {
      payload.customShares = participants.value
        .map((p) => ({ userId: p.user_id, amountOwed: Number(customAmounts[p.user_id]) || 0 }))
        .filter((s) => s.amountOwed > 0)
    }
    await addExpense(props.meetId, payload)
    form.label = ''
    form.totalAmount = 0
    await reload()
    toast.success('Expense added.')
  } catch (err) {
    toast.error(err.message || 'Could not add the expense.')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await deleteExpense(id)
    await reload()
    toast.success('Expense deleted.')
  } catch (err) {
    toast.error(err.message || 'Could not delete the expense.')
  }
}
</script>

<style scoped>
.expenses-panel { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.expenses-panel__form { display: flex; flex-wrap: wrap; gap: var(--space-s, 8px); align-items: flex-end; }
.expenses-panel__field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); font-size: 0.85rem; }
.expenses-panel__field input, .expenses-panel__field select { padding: var(--space-xs, 4px); border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px); }
.expenses-panel__custom { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.expenses-panel__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.expenses-panel__expense-head { display: flex; gap: var(--space-s, 8px); align-items: center; }
.expenses-panel__shares { list-style: none; padding-left: var(--space-m, 16px); }
</style>
```

- [ ] **Step 4: Run the ExpensesPanel test**

Run: `npm test -- src/components/payments/ExpensesPanel.spec.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the PaymentsPanel failing test**

Create `src/components/payments/PaymentsPanel.spec.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const uploadPaymentProof = vi.fn().mockResolvedValue('https://x/proof.png')
vi.mock('../../composables/useStorage.js', () => ({ useStorage: vi.fn(() => ({ uploadPaymentProof })) }))

const createPayment = vi.fn().mockResolvedValue({ id: 'pay1' })
const listPaymentsForMeet = vi.fn().mockResolvedValue([
  { id: 'pay1', user_id: 'u1', amount: 10, status: 'pending', proof_url: 'https://x/proof.png', user: { id: 'u1', full_name: 'Me' } },
])
const confirmPayment = vi.fn().mockResolvedValue(undefined)
const rejectPayment = vi.fn().mockResolvedValue(undefined)
const remindUser = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/usePayments.js', () => ({
  usePayments: vi.fn(() => ({ createPayment, listPaymentsForMeet, confirmPayment, rejectPayment, remindUser })),
}))

const listParticipants = vi.fn().mockResolvedValue([{ user_id: 'u1', profiles: { full_name: 'Me' } }])
vi.mock('../../composables/useMeetParticipants.js', () => ({ useMeetParticipants: vi.fn(() => ({ listParticipants })) }))

import PaymentsPanel from './PaymentsPanel.vue'

describe('PaymentsPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('participant uploads proof + creates a pending payment', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: false, feeAmount: 10 } })
    await flushPromises()
    const input = wrapper.find('[data-testid="proof-file"]')
    await input.setValue('')
    Object.defineProperty(input.element, 'files', { value: [{ name: 'proof.png' }] })
    await wrapper.find('[data-testid="upload-proof"]').trigger('click')
    await flushPromises()
    expect(uploadPaymentProof).toHaveBeenCalled()
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ meetId: 'm1', amount: 10, proofUrl: 'https://x/proof.png' }), 'u1')
  })

  it('organizer sees confirm/reject/remind buttons for a pending payment', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: true, feeAmount: 10 } })
    await flushPromises()
    expect(wrapper.find('[data-testid="confirm-payment"]').exists()).toBe(true)
    await wrapper.find('[data-testid="confirm-payment"]').trigger('click')
    await flushPromises()
    expect(confirmPayment).toHaveBeenCalledWith('pay1')
  })

  it('organizer can reject + remind', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: true, feeAmount: 10 } })
    await flushPromises()
    await wrapper.find('[data-testid="reject-payment"]').trigger('click')
    await wrapper.find('[data-testid="remind-payment"]').trigger('click')
    await flushPromises()
    expect(rejectPayment).toHaveBeenCalledWith('pay1')
    expect(remindUser).toHaveBeenCalledWith('pay1')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- src/components/payments/PaymentsPanel.spec.js`
Expected: FAIL (component not found).

- [ ] **Step 7: Write PaymentsPanel.vue**

Create `src/components/payments/PaymentsPanel.vue`:

```vue
<template>
  <section class="payments-panel">
    <h3>Payments</h3>

    <!-- Participant: upload proof -->
    <div v-if="!isOrganizer && feeAmount > 0" class="payments-panel__upload">
      <p>You owe Rp{{ feeAmount.toLocaleString('id-ID') }} for this meet.</p>
      <input data-testid="proof-file" type="file" accept="image/*" @change="onFile" ref="fileInput" />
      <LiButton data-testid="upload-proof" :loading="uploading" @click="handleUpload">Upload proof</LiButton>
    </div>

    <!-- Organizer: outstanding balance + review -->
    <ul v-if="isOrganizer" class="payments-panel__list">
      <li v-for="p in payments" :key="p.id" class="payments-panel__row">
        <span>{{ p.user?.full_name }} — Rp{{ Number(p.amount).toLocaleString('id-ID') }}</span>
        <a v-if="p.proof_url" :href="p.proof_url" target="_blank" rel="noopener">proof</a>
        <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
        <template v-if="p.status === 'pending'">
          <LiButton data-testid="confirm-payment" size="sm" @click="handleConfirm(p.id)">Confirm</LiButton>
          <LiButton data-testid="reject-payment" size="sm" variant="ghost" @click="handleReject(p.id)">Reject</LiButton>
          <LiButton data-testid="remind-payment" size="sm" variant="ghost" @click="handleRemind(p.id)">Remind</LiButton>
        </template>
      </li>
      <li v-if="!payments.length" class="payments-panel__empty">No payments yet.</li>
    </ul>

    <!-- Participant: own payments -->
    <ul v-else class="payments-panel__list">
      <li v-for="p in myPayments" :key="p.id" class="payments-panel__row">
        <span>Rp{{ Number(p.amount).toLocaleString('id-ID') }}</span>
        <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
      </li>
      <li v-if="!myPayments.length" class="payments-panel__empty">No payments yet.</li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiButton, LiBadge, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { usePayments } from '../../composables/usePayments.js'
import { useStorage } from '../../composables/useStorage.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const props = defineProps({
  meetId: { type: String, required: true },
  isOrganizer: { type: Boolean, default: false },
  feeAmount: { type: Number, default: 0 },
})

const toast = useToast()
const { user } = useAuth()
const { createPayment, listPaymentsForMeet, confirmPayment, rejectPayment, remindUser } = usePayments()
const { uploadPaymentProof } = useStorage()
const { listParticipants } = useMeetParticipants()

const payments = ref([])
const fileInput = ref(null)
const uploading = ref(false)

const myPayments = computed(() => payments.value.filter((p) => p.user_id === user.value?.id))

async function reload() {
  payments.value = await listPaymentsForMeet(props.meetId)
}

onMounted(async () => {
  try {
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load payments.')
  }
})

function onFile() { /* file is read at upload time */ }

async function handleUpload() {
  const file = fileInput.value?.files?.[0]
  if (!file) {
    toast.error('Pick a proof image first.')
    return
  }
  uploading.value = true
  try {
    const proofUrl = await uploadPaymentProof(file)
    await createPayment({ meetId: props.meetId, amount: props.feeAmount, proofUrl }, user.value.id)
    await reload()
    toast.success('Proof uploaded — pending organizer confirmation.')
  } catch (err) {
    toast.error(err.message || 'Could not upload the proof.')
  } finally {
    uploading.value = false
  }
}

async function handleConfirm(id) {
  try { await confirmPayment(id); await reload(); toast.success('Payment confirmed.') }
  catch (err) { toast.error(err.message || 'Could not confirm.') }
}
async function handleReject(id) {
  try { await rejectPayment(id); await reload(); toast.success('Payment rejected.') }
  catch (err) { toast.error(err.message || 'Could not reject.') }
}
async function handleRemind(id) {
  try { await remindUser(id); toast.success('Reminder sent.') }
  catch (err) { toast.error(err.message || 'Could not send reminder.') }
}

function statusVariant(status) {
  if (status === 'confirmed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
</script>

<style scoped>
.payments-panel { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.payments-panel__upload { display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.payments-panel__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.payments-panel__row { display: flex; align-items: center; gap: var(--space-s, 8px); flex-wrap: wrap; }
</style>
```

- [ ] **Step 8: Run the PaymentsPanel test**

Run: `npm test -- src/components/payments/PaymentsPanel.spec.js`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/payments/ExpensesPanel.vue src/components/payments/ExpensesPanel.spec.js src/components/payments/PaymentsPanel.vue src/components/payments/PaymentsPanel.spec.js
git commit -m "feat(p5): ExpensesPanel + PaymentsPanel components"
```

---

### Task 6: Wire into MeetDetailView + final build

**Files:**
- Modify: `src/views/meets/MeetDetailView.vue`

**Interfaces:**
- Adds a "Payments" tab (index 3, after Participants) — note this shifts Chat to index 4. Render `ExpensesPanel` + `PaymentsPanel` with `meetId = meet.id`, `isOrganizer = meet.creator_id === user.id`, `feeAmount = meet.fee_amount`.

- [ ] **Step 1: Add the Payments tab to MeetDetailView**

In `src/views/meets/MeetDetailView.vue`:

1. Update the `tabs` array (currently Details/Participants/Matches/Chat) to insert `Payments` before `Matches`:

```js
const tabs = [
  { label: 'Details' },
  { label: 'Participants' },
  { label: 'Payments' },
  { label: 'Matches' },
  { label: 'Chat' },
]
```

2. Add the panel markup. The Matches tab moves from `activeTab === 2` to `=== 3`, and Chat from `3` to `=== 4`. Insert a new `v-show="activeTab === 2"` block before the Matches block:

```vue
      <!-- Payments -->
      <div v-show="activeTab === 2">
        <ExpensesPanel :meet-id="meet.id" :is-organizer="isOrganizer" />
        <PaymentsPanel :meet-id="meet.id" :is-organizer="isOrganizer" :fee-amount="meet.fee_amount" />
      </div>

      <!-- Matches (Phase 4 placeholder) -->
      <div v-show="activeTab === 3">
        <LiEmptyState title="Matches open in Phase 4" icon="trophy" />
      </div>

      <!-- Chat -->
      <div v-show="activeTab === 4">
        <MeetChat :meet-id="meet.id" />
      </div>
```

3. Add the imports + `isOrganizer` computed + component registration. In the `<script setup>` block, add after the existing imports:

```js
import ExpensesPanel from '../../components/payments/ExpensesPanel.vue'
import PaymentsPanel from '../../components/payments/PaymentsPanel.vue'
```

And add the computed (alongside `myParticipation`):

```js
const isOrganizer = computed(() => meet.value?.creator_id === user.value?.id)
```

- [ ] **Step 2: Run the full suite**

Run: `npm test 2>&1 | tail -8`
Expected: all tests PASS (124 prior + new Phase 5 tests, no regressions). The MeetDetailView spec (if it indexes tabs by label rather than number) stays green; if it asserts `activeTab === 2` is Matches, update that assertion to the new index.

- [ ] **Step 3: Run the build**

Run: `npm run build 2>&1 | tail -6`
Expected: build succeeds, PWA precache entry count increases.

- [ ] **Step 4: Commit**

```bash
git add src/views/meets/MeetDetailView.vue
git commit -m "feat(p5): wire ExpensesPanel + PaymentsPanel into MeetDetailView"
```

---

## Deferred (out of scope for Phase 5 V1)

- Competition-fee payments UI — the RPC + `usePayments` already accept `competitionId`, but the CompetitionDetailView panel is deferred (meet fees cover the core flow).
- Membership/recurring-pass payment confirmation — `useClubMemberships.subscribe` (Phase 3) creates an active subscription immediately; routing its payment through `confirm_payment` is a clean follow-up. The RPC's competition-organizer branch shows the pattern; a membership-organizer branch + `subscribeWithPayment` is the upgrade path.
- Syncing `meet_participants.payment_status` (denormalized column) from `payments` rows — the PaymentsPanel derives status live from `payments`; the column stays as-is.
- Re-uploading proof after rejection — participant inserts a new `payments` row (the tightened update policy blocks participant edits); a `update_payment_proof` RPC is the upgrade path if re-upload-in-place is wanted.
- Payment-triggered notifications (auto "payment confirmed" notification) — the `confirm_payment` RPC could insert a notification; deferred to keep the RPC focused.
