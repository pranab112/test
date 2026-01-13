// Green Palace Theme Constants
// Clean emerald theme - premium, trustworthy, elegant

export const Colors = {
  // Primary colors - Emerald (clean, professional)
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',

  // Secondary/Accent colors
  accent: '#6EE7B7',
  accentDark: '#047857',

  // Background colors
  background: '#0a0a0a',
  surface: '#111111',
  surfaceLight: '#1a1a1a',
  surfaceLighter: '#242424',

  // Text colors
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',
  textPrimary: '#10B981',

  // Status colors
  success: '#10B981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Border colors
  border: 'rgba(16, 185, 129, 0.2)',
  borderLight: 'rgba(16, 185, 129, 0.3)',
  borderSolid: '#2a2a2a',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Online status
  online: '#10B981',
  offline: '#666666',

  // Network node colors
  node: '#10B981',
  nodeGlow: 'rgba(16, 185, 129, 0.4)',

  // Gradients (as string for reference)
  gradientStart: '#10B981',
  gradientEnd: '#059669',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  lg: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};

// App branding
export const AppBranding = {
  name: 'Green Palace',
  tagline: 'Premium Sweepstakes Platform',
  logoColor: '#10B981',
} as const;
