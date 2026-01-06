// GoldenAce Theme Constants
// Matching the website's dark theme with gold accents

export const Colors = {
  // Primary colors
  primary: '#FFD700',
  primaryDark: '#D4AF37',
  primaryLight: '#FFC700',

  // Background colors
  background: '#0d0d0d',
  surface: '#1a1a1a',
  surfaceLight: '#2d2d2d',
  surfaceLighter: '#3a3a3a',

  // Text colors
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',

  // Status colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Border colors
  border: '#3a3a3a',
  borderLight: '#4a4a4a',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Online status
  online: '#22c55e',
  offline: '#666666',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};
