import { describe, it, expect, vi, beforeEach } from 'vitest'

// Thenable per-table builder: any method returns `self`, and `await self` resolves
// to `resolved`. This supports both `await ...insert(rows)` (bare) and
// `await ...insert().select().single()` (terminal .single() returns self too).
function builder(resolved) {
  const self = {
    insert: vi.fn(() => self),
    select: vi.fn(() => self),
    values: vi.fn(() => self),
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    delete: vi.fn(() => self),
    single: vi.fn(() => self),
    then: (resolve) => resolve(resolved),
  }
  return self
}

const tables = {}
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table) => {
      tables[table] = tables[table] ?? builder({ data: null, error: null })
      return tables[table]
    }),
  },
}))

import { supabase } from '../lib/supabase.js'
import { useExpenses } from './useExpenses.js'

// Reset the per-table builders between tests (they capture call state).
function setTable(table, resolved) {
  tables[table] = builder(resolved)
  return tables[table]
}

describe('useExpenses', () => {
  beforeEach(() => {
    for (const k of Object.keys(tables)) delete tables[k]
    supabase.from.mockClear()
  })

  it('addExpense equal-split computes per-participant shares that sum to totalAmount', async () => {
    const expenseRow = { id: 'e1', meet_id: 'm1', label: 'Court', total_amount: 30, split_method: 'equal' }
    setTable('meet_expenses', { data: expenseRow, error: null })
    const sharesB = setTable('meet_expense_shares', { data: null, error: null })

    const { addExpense } = useExpenses()
    const result = await addExpense('m1', { label: 'Court', totalAmount: 30, splitMethod: 'equal', participantIds: ['u1', 'u2', 'u3'] })

    expect(result).toEqual(expenseRow)
    const sharesCall = sharesB.insert.mock.calls[0][0]
    const sum = sharesCall.reduce((s, r) => s + Number(r.amount_owed), 0)
    expect(sum).toBe(30)
    expect(sharesCall).toHaveLength(3)
    expect(sharesCall[0]).toMatchObject({ meet_expense_id: 'e1', user_id: 'u1' })
  })

  it('addExpense custom-split uses the provided customShares', async () => {
    setTable('meet_expenses', { data: { id: 'e2' }, error: null })
    const sharesB = setTable('meet_expense_shares', { data: null, error: null })

    const { addExpense } = useExpenses()
    await addExpense('m1', {
      label: 'Balls', totalAmount: 20, splitMethod: 'custom', participantIds: ['u1', 'u2'],
      customShares: [{ userId: 'u1', amountOwed: 15 }, { userId: 'u2', amountOwed: 5 }],
    })
    expect(sharesB.insert.mock.calls[0][0]).toEqual([
      { meet_expense_id: 'e2', user_id: 'u1', amount_owed: 15 },
      { meet_expense_id: 'e2', user_id: 'u2', amount_owed: 5 },
    ])
  })

  it('listExpensesWithShares embeds shares with profiles', async () => {
    setTable('meet_expenses', {
      data: [{ id: 'e1', shares: [{ user_id: 'u1', amount_owed: 10, user: { id: 'u1', full_name: 'A' } }] }],
      error: null,
    })
    const { listExpensesWithShares } = useExpenses()
    const rows = await listExpensesWithShares('m1')
    expect(rows[0].shares[0].user.full_name).toBe('A')
    expect(supabase.from).toHaveBeenCalledWith('meet_expenses')
  })

  it('deleteExpense deletes by id', async () => {
    const expB = setTable('meet_expenses', { data: null, error: null })
    const { deleteExpense } = useExpenses()
    await deleteExpense('e1')
    expect(expB.eq).toHaveBeenCalledWith('id', 'e1')
    expect(expB.delete).toHaveBeenCalled()
  })

  it('throws on error', async () => {
    setTable('meet_expenses', { data: null, error: { message: 'boom' } })
    const { addExpense } = useExpenses()
    await expect(addExpense('m1', { label: 'x', totalAmount: 10, splitMethod: 'equal', participantIds: ['u1', 'u2'] })).rejects.toThrow('boom')
  })
})
