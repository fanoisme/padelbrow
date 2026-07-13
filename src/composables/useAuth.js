import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const user = ref(null)
let initPromise = null

export function initAuth() {
  if (!initPromise) {
    initPromise = supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })
    })
  }
  return initPromise
}

async function signUpWithPassword(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

async function signInWithGoogle() {
  // redirectTo intentionally has no hash fragment: Supabase appends the OAuth
  // `?code=` query param to this URL, and query params can't follow a `#` —
  // landing on the bare origin lets supabase-js's built-in URL detection
  // pick up the session before the hash-mode router takes over.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  if (error) throw error
  return data
}

async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  user.value = null
}

export function useAuth() {
  return { user, signUpWithPassword, signInWithPassword, signInWithGoogle, signOut }
}
