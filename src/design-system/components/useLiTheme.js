/**
 * useLiTheme — composable for Lithium design token access
 * Provides CSS custom property values for consistent theming across components.
 */
import { computed } from 'vue'

const TOKENS = {
  // Gray (dark-first: gray900 = lightest, gray0 = darkest)
  gray900: '#FFFFFF',
  gray800: '#EBEBEB',
  gray700: '#CCCCCC',
  gray600: '#A3A3A3',
  gray500: '#8A8A8A',
  gray400: '#525252',
  gray300: '#3A3A3A',
  gray200: '#252525',
  gray100: '#121212',
  gray0: '#000000',

  // Brand
  brand: '#FFAF03',

  // CTA
  ctaPrimaryBg: '#FFBC25',
  ctaPrimaryText: '#0A0A0A',
  ctaPrimaryHover: '#FAB000',
  ctaSecondaryBorder: '#2A2A2A',
  ctaSecondaryText: '#FFFFFF',
  ctaDangerBg: '#C83E3B',
  ctaDangerText: '#FFFFFF',
  ctaGhostText: '#A3A3A3',
  ctaGhostHoverBg: '#1A1A1A',

  // Semantic
  success: '#10B981',
  successLight: '#0A2E1F',
  warning: '#FF6B00',
  warningLight: '#2E1A00',
  error: '#C83E3B',
  errorLight: '#2E0A0A',
  info: '#2563EB',
  infoLight: '#0A0E2E',

  // Spacing
  spaceXs: '4px',
  spaceS: '8px',
  spaceM: '12px',
  spaceL: '16px',
  spaceXl: '24px',
  space2xl: '32px',
  space3xl: '48px',

  // Radius
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '16px',
  radiusPill: '999px',

  // Motion
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  durMicro: '120ms',
  durShort: '200ms',
  durMedium: '300ms',
}

export function useLiTheme() {
  const tokens = computed(() => TOKENS)
  const cssVar = (name) => `var(--${name})`

  /**
   * Returns a CSS-ready value for a token key.
   * Falls back to hardcoded value if CSS variable isn't set.
   */
  function token(key) {
    return TOKENS[key] ?? cssVar(key)
  }

  return { tokens, token, cssVar }
}
