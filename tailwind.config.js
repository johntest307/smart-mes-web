/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base': '#0F1419',
        'surface': '#1A232E',
        'accent-blue': '#4A90C7',
        'accent-purple': '#C9975E',
        'accent-green': '#5BA87A',
        'warning': '#E8A838',
        'danger': '#D9534F',
        'text-primary': '#E8ECEF',
        'text-muted': '#8896A6'
      },
      fontFamily: {
        'sans': ['Inter', 'Noto Sans TC', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
        '17': 'repeat(17, minmax(0, 1fr))',
        '18': 'repeat(18, minmax(0, 1fr))',
        '19': 'repeat(19, minmax(0, 1fr))',
        '20': 'repeat(20, minmax(0, 1fr))',
      }
    },
  },
  plugins: [],
}
