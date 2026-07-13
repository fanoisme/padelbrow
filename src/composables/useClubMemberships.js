import { supabase } from '../lib/supabase.js'

const PERIOD_DAYS = { monthly: 30, quarterly: 90, annual: 365 }

function computeExpiry(period, from = new Date()) {
  const days = PERIOD_DAYS[period]
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function useClubMemberships() {
  async function listMemberships(clubId) {
    const { data, error } = await supabase
      .from('club_memberships')
      .select('*')
      .eq('club_id', clubId)
      .order('price')
    if (error) throw error
    return data
  }

  async function createMembership(clubId, { name, price, period, perks }) {
    const { data, error } = await supabase
      .from('club_memberships')
      .insert({ club_id: clubId, name, price, period, perks })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function subscribe(membershipId, userId, period) {
    const { data, error } = await supabase
      .from('club_membership_subscriptions')
      .insert({
        membership_id: membershipId,
        user_id: userId,
        status: 'active',
        expires_at: computeExpiry(period),
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  return { listMemberships, createMembership, subscribe }
}
