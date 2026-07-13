import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpc, tables } = vi.hoisted(() => ({ rpc: vi.fn(), tables: {} }))
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table) => {
      tables[table] = tables[table] ?? { _resolved: { data: null, error: null } }
      return tables[table]
    }),
    rpc,
  },
}))

import { supabase } from '../lib/supabase.js'
import { usePayments } from './usePayments.js'

// Thenable builder so `await supabase.from('payments').insert().select().single()`
// and `await ...select().eq().order()` both resolve to `resolved`.
function builder(resolved) {
  const self = {
    insert: vi.fn(() => self),
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    single: vi.fn(() => self),
    then: (resolve) => resolve(resolved),
  }
  return self
}

function setTable(table, resolved) {
  const b = builder(resolved)
  tables[table] = b
  supabase.from.mockImplementation((t) => tables[t])
  return b
}

describe('usePayments', () => {
  beforeEach(() => {
    for (const k of Object.keys(tables)) delete tables[k]
    supabase.from.mockImplementation((t) => {
      tables[t] = tables[t] ?? builder({ data: null, error: null })
      return tables[t]
    })
    rpc.mockReset()
  })

  it('createPayment inserts a pending row with user_id + returns it', async () => {
    const b = setTable('payments', { data: { id: 'p1', status: 'pending' }, error: null })
    const { createPayment } = usePayments()
    const row = await createPayment({ meetId: 'm1', amount: 10, proofUrl: 'https://x/p.png' }, 'u1')
    expect(b.insert).toHaveBeenCalledWith({
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
    const b = setTable('payments', {
      data: [{ id: 'p1', user: { full_name: 'A' }, expense_share: { amount_owed: 10 } }],
      error: null,
    })
    const { listPaymentsForMeet } = usePayments()
    const rows = await listPaymentsForMeet('m1')
    expect(rows[0].user.full_name).toBe('A')
    expect(b.eq).toHaveBeenCalledWith('meet_id', 'm1')
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
