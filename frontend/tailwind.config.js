/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        healthcare: {
          bg: '#050B0A',
          surface: '#0B1514',
          surfaceLight: '#10211F',
          surfaceHover: '#162E2A',
          border: '#193833',
          borderSubtle: '#112623',
          borderStrong: '#254E47',
          textPrimary: '#E6F4F1',
          textSecondary: '#8BA39E',
          textMuted: '#526E69',
          accentTeal: '#14b8a6',
          accentEmerald: '#10b981',
          accentCyan: '#06b6d4',
          alertCritical: '#f43f5e',
          alertWarning: '#f59e0b',
          alertInfo: '#38bdf8',
          alertSuccess: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
