/**
 * useParticles — CSS-only confetti + sparkle bursts (Design Guide §1D).
 * Spawns a transient layer inside the origin element's positioning context,
 * then removes it after the lifespan. No-op under prefers-reduced-motion.
 * The actual motion is CSS keyframes (lith-confetti-fall / lith-sparkle)
 * already defined in tokens.css; this composable only creates the DOM.
 */

const CONFETTI_COLORS = [
  'var(--confetti-color-1, #F9C700)',
  'var(--confetti-color-2, #FF8C00)',
  'var(--confetti-color-3, #FFAF03)',
]

function reducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function spawn(origin, { count, className, lifespan, styleFn }) {
  if (!origin || reducedMotion()) return
  if (getComputedStyle(origin).position === 'static') origin.style.position = 'relative'

  const layer = document.createElement('div')
  layer.className = 'li-particles'
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, {
    position: 'absolute', inset: '0', overflow: 'visible', pointerEvents: 'none',
  })

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = `li-particles__p ${className}`
    styleFn(p, i, count)
    layer.appendChild(p)
  }

  origin.appendChild(layer)
  setTimeout(() => layer.remove(), lifespan)
}

export function useParticles() {
  function confetti(origin, opts = {}) {
    const count = opts.count ?? 16
    const lifespan = opts.lifespan ?? 1200
    spawn(origin, {
      count, className: 'li-particles__p--confetti', lifespan,
      styleFn: (p, i) => {
        const angle = (Math.PI * 2 * i) / count
        const dist = 40 + (i % 5) * 12
        const size = 4 + (i % 3) * 3
        Object.assign(p.style, {
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${size}px`, height: `${size}px`,
          borderRadius: '2px',
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `lith-confetti-fall ${lifespan}ms cubic-bezier(0.4,0,0.2,1) forwards`,
          ['--confetti-rotation']: `${(i * 53) % 720}deg`,
          transform: `translate(-50%, -50%) translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
        })
      },
    })
  }

  function sparkle(origin, opts = {}) {
    const count = opts.count ?? 5
    const lifespan = opts.lifespan ?? 800
    spawn(origin, {
      count, className: 'li-particles__p--sparkle', lifespan,
      styleFn: (p, i) => {
        const size = 6
        const ox = (i - count / 2) * 14
        const oy = (i % 2 ? -1 : 1) * 10
        Object.assign(p.style, {
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${size}px`, height: `${size}px`,
          background: 'var(--sparkle-color, rgba(255,255,255,0.9))',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          animation: `lith-sparkle ${lifespan}ms cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms forwards`,
          transform: `translate(-50%, -50%) translate(${ox}px, ${oy}px)`,
        })
      },
    })
  }

  return { confetti, sparkle }
}
