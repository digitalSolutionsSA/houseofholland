/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        'bg-elevated': '#181818',
        'bg-card': '#272729',
        'bg-muted': '#222224',
        'bg-chip': '#323234',
        gold: '#d4af37',
        'gold-bright': '#e8c547',
        'gold-warm': '#c58e4b',
        'gold-deep': '#8a6e2f',
        'gold-muted': '#a8924a',
        text: '#ffffff',
        'text-muted': '#9a9a9a',
        'text-dim': '#6b6b6b',
        'text-on-gold': '#1a1a1a',
        'border-gold': 'rgba(212,175,55,0.45)',
        'border-subtle': 'rgba(255,255,255,0.16)',
      },
      fontFamily: {
        sans: ['Outfit_400Regular', 'system-ui'],
        'sans-medium': ['Outfit_500Medium', 'system-ui'],
        'sans-bold': ['Outfit_700Bold', 'system-ui'],
        serif: ['CormorantGaramond_600SemiBold', 'Georgia'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
