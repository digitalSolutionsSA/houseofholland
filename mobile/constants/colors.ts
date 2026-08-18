export const Colors = {
  bg: '#000000',
  bgElevated: '#181818',
  bgCard: '#272729',
  bgMuted: '#222224',
  bgChip: '#323234',

  gold: '#d4af37',
  goldBright: '#e8c547',
  goldWarm: '#c58e4b',
  goldDeep: '#8a6e2f',
  goldMuted: '#a8924a',

  text: '#ffffff',
  textMuted: '#9a9a9a',
  textDim: '#6b6b6b',
  textOnGold: '#1a1a1a',

  borderGold: 'rgba(212,175,55,0.45)',
  borderSubtle: 'rgba(255,255,255,0.16)',

  // Tier themes
  premium: {
    accent: '#dc2626',
    bg: '#0f0f0f',
    bgElevated: '#1e1e1e',
    bgCard: '#2a2a2a',
  },
  free: {
    accent: '#111111',
    bg: '#ffffff',
    bgElevated: '#f0f0f0',
    bgCard: '#e8e8e8',
    text: '#0a0a0a',
    textMuted: '#444444',
  },
} as const

// Gold gradient stops for LinearGradient
export const GoldGradient = ['#b8860b', '#ffd700', '#c9a227', '#b8860b'] as const
export const GoldGradientBtn = ['#c9a227', '#e8c547', '#a67c2a'] as const
