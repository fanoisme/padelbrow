import { ref, computed } from 'vue'

/**
 * useCursorAwareness — desktop-only (pointer: fine), reduced-motion-safe
 * cursor effects (Design Guide §1B): spotlight, 3D tilt, magnetic pull.
 * Callers gate the actual listeners on `enabled`.
 */
function prefers(query) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

export function useCursorAwareness() {
  const reducedMotion = prefers('(prefers-reduced-motion: reduce)')
  const coarsePointer = prefers('(pointer: coarse)')
  const enabled = computed(() => !reducedMotion && !coarsePointer)

  /**
   * magnetic(opts?) — returns { onMove, onLeave, style } for a ref-bound element.
   * style is a reactive object for :style binding (translate toward cursor).
   */
  function magnetic(opts = {}) {
    const strength = opts.strength ?? 4
    const x = ref(0)
    const y = ref(0)
    const style = computed(() => ({ transform: `translate(${x.value}px, ${y.value}px)` }))

    function onMove(e, el) {
      if (!enabled.value || !el) return
      const rect = el.getBoundingClientRect()
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
      x.value = Math.round(dx * strength * 10) / 10
      y.value = Math.round(dy * strength * 10) / 10
    }
    function onLeave() { x.value = 0; y.value = 0 }

    return { onMove, onLeave, style }
  }

  /**
   * tilt(opts?) — returns { onMove, onLeave, style } producing a rotateX/rotateY
   * transform tracked to the cursor (max --rotate-dynamic).
   */
  function tilt(opts = {}) {
    const maxDeg = opts.maxDeg ?? 8
    const rx = ref(0)
    const ry = ref(0)
    const style = computed(() => ({
      transform: `perspective(1000px) rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
    }))

    function onMove(e, el) {
      if (!enabled.value || !el) return
      const rect = el.getBoundingClientRect()
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
      ry.value = Math.round(dx * maxDeg * 10) / 10
      rx.value = Math.round(-dy * maxDeg * 10) / 10
    }
    function onLeave() { rx.value = 0; ry.value = 0 }

    return { onMove, onLeave, style }
  }

  return { enabled, magnetic, tilt }
}
