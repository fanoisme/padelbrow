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
