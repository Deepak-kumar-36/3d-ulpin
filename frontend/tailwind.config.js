/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#050505', dim: '#0a0a0a', bright: '#111111', variant: '#1a1a1a', tint: '#222222' },
        'surface-container': { lowest: '#000000', low: '#050505', DEFAULT: '#0a0a0a', high: '#111111', highest: '#1a1a1a' },
        'on-surface': { DEFAULT: '#ffffff', variant: '#888888', dim: '#555555' },
        primary: { DEFAULT: '#ffffff', container: '#222222', fixed: '#dddddd', 'fixed-dim': '#aaaaaa' },
        'on-primary': { DEFAULT: '#000000', container: '#ffffff', fixed: '#000000' },
        secondary: { DEFAULT: '#888888', container: '#333333', fixed: '#666666', 'fixed-dim': '#444444' },
        'on-secondary': { DEFAULT: '#ffffff', container: '#dddddd' },
        tertiary: { DEFAULT: '#8da399', container: '#2c3631', fixed: '#b4c9bf', 'fixed-dim': '#768c82' }, // The muted sage accent
        'on-tertiary': { DEFAULT: '#000000', container: '#ffffff' },
        error: { DEFAULT: '#ff5555', container: '#330000' },
        'on-error': { DEFAULT: '#000000', container: '#ffaaaa' },
        outline: { DEFAULT: '#333333', variant: '#222222' },
        inverse: { surface: '#ffffff', 'on-surface': '#000000', primary: '#000000' },
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-hero': ['180px', { lineHeight: '0.9', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-hero-mobile': ['80px', { lineHeight: '0.9', letterSpacing: '-0.03em', fontWeight: '800' }],
        'headline-lg': ['80px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'headline-md': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-sm': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label-caps': ['10px', { lineHeight: '14px', letterSpacing: '0.15em', fontWeight: '600' }],
        'data-mono': ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '500' }],
        'data-mono-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '400' }],
      },
      borderRadius: { DEFAULT: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0' }, // Sharp corners for architecture theme
      spacing: {
        'space-2xs': '0.125rem', 'space-xs': '0.25rem', 'space-sm': '0.5rem', 'space-md': '1rem',
        'space-lg': '1.5rem', 'space-xl': '2.5rem', 'space-2xl': '4rem',
        gutter: '1.5rem', 'gutter-sm': '1rem', 'gutter-lg': '2rem',
        margin: '2rem', 'margin-sm': '1rem', 'margin-lg': '3rem',
      },
      boxShadow: {
        'cadastre-sm': 'none',
        'cadastre': 'none',
        'cadastre-md': 'none',
        'cadastre-lg': 'none',
      },
    },
  },
  plugins: [],
};
