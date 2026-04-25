// TNG Digital eWallet Design System
// Brand colors from Touch 'n Go official brand guide

export const TNG = {
  // Primary brand colors
  blue: '#005BAA',
  blueDark: '#004A8F',
  blueLight: '#1A6FBB',
  yellow: '#FFD700',
  yellowLight: '#FFE033',

  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgBlue: '#005BAA',
  bgBlueDark: '#004080',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5A6475',
  textMuted: '#9BA5B4',
  textWhite: '#FFFFFF',
  textOnBlue: '#FFFFFF',
  textOnYellow: '#1A1A2E',

  // States
  success: '#00B374',
  successLight: '#E6F7F2',
  error: '#E53935',
  errorLight: '#FDECEA',
  warning: '#FFB300',

  // UI
  border: '#E0E6ED',
  borderLight: '#F0F3F7',
  divider: '#EAECF0',
  shadow: 'rgba(0, 91, 170, 0.12)',

  // Spacing
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
  },

  // Typography
  font: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 38,
  },
} as const;
