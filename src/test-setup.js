// jsdom (our vitest test environment) does not implement window.matchMedia.
// The vendored Lithium design system (src/design-system) calls matchMedia to
// respect prefers-reduced-motion, so we polyfill it here for tests only.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = function matchMedia(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }
  }
}

// jsdom also lacks IntersectionObserver, which LiRevealOnScroll uses to reveal
// content on scroll. Polyfill: fire isIntersecting immediately so above-the-fold
// content renders visible in tests.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor(cb) { this.cb = cb }
    observe(el) { this.cb([{ isIntersecting: true, target: el }], this) }
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
}

// jsdom lacks ResizeObserver, which LiDropdown uses to reposition its menu on
// viewport resize. Polyfill: no-op (position is recomputed on each open).
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
