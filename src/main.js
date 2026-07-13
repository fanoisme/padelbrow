import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './design-system/tokens.css'
import { initAuth } from './composables/useAuth.js'

// initAuth() restores any existing Supabase session into the reactive `user`
// ref and registers the onAuthStateChange listener that signIn* rely on to
// update `user.value`. Awaiting it before mount avoids a race where the first
// navigation hits the auth guard before the session is restored.
initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
