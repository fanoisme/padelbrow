import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

export function useProfile() {
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchProfile(userId) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    loading.value = false
    if (err) {
      error.value = err.message
      return null
    }
    profile.value = data
    return data
  }

  async function updateProfile(userId, updates) {
    const { data, error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (err) throw err
    profile.value = data
    return data
  }

  return { profile, loading, error, fetchProfile, updateProfile }
}
