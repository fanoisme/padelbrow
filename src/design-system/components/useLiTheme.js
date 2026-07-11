/**
 * useLiTheme — composable for Lithium design token access
 * Provides CSS custom property values for consistent theming across components.
 */
import { computed } from 'vue'

const TOKENS = {
  // Gray
  gray900: '#333333',
  gray800: '#4D4D4D',
  gray700: '#666666',
  gray600: '#808080',
  gray500: '#999999',
  gray400: '#B3B3B3',
  gray300: '#CCCCCC',
  gray200: '#E6E6E6',
  gray100: '#F2F2F2',
  gray0: '#FFFFFF',

  // Brand
  brand: '#FFAF03',

  // CTA
  ctaPrimaryBg: '#FFBC25',
  ctaPrimaryText: '#1E1E1E',
  ctaPrimaryHover: '#FAB000',
  ctaSecondaryBorder: '#CCCCCC',
  ctaSecondaryText: '#333333',
  ctaDangerBg: '#C83E3B',
  ctaDangerText: '#FFFFFF',
  ctaGhostText: '#808080',
  ctaGhostHoverBg: '#F2F2F2',

  // Semantic
  success: '#10B981',
  successLight: '#ECFF8F',
  warning: '#FF6B00',
  warningLight: '#FFF3D6',
  error: '#C83E3B',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#E6E6FF',

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
