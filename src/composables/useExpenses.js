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
