import { onMounted, onUnmounted, ref } from 'vue'

// Breakpoint convention for this app (see tokens.css comment block):
// 480px phone, 768px tablet/nav-collapse, 1024px wide desktop.
const MOBILE_QUERY = '(max-width: 768px)'

export function useViewport() {
  const isMobile = ref(false)
  let mql = null

  function handleChange(e) {
    isMobile.value = e.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(MOBILE_QUERY)
    isMobile.value = mql.matches
    mql.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    if (mql) mql.removeEventListener('change', handleChange)
  })

  return { isMobile }
}
