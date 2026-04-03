/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Bật chế độ dark/light qua class 'dark' trên <html>
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
        },
        accent: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        border: 'hsl(var(--border))',
        textMain: 'hsl(var(--text-main))',
        textMuted: 'hsl(var(--text-muted))',
      },
      backgroundImage: {
        'glass-gradient': 'var(--glass-gradient)',
      },
      borderColor: {
        glass: 'var(--glass-border)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
