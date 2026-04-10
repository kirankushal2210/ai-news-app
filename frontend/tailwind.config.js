/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:          '#05070A',
        primary:     '#00FFB2',
        secondary:   '#4F9CF9',
        accent:      '#A78BFA',
        'text-main': '#E6EDF3',
        muted:       '#8B949E',
        surface:     '#0D1117',
        'surface-alt': '#161B22',
        danger:      '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}
