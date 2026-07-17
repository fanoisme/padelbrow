import { supabase } from '../lib/supabase.js'

export function useMeets() {
  async function listMeets() {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('meets')
      .select('*, meet_participants(count)')
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
