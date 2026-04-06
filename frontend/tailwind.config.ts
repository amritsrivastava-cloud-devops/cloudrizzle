import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#07090e',
          secondary: '#0c0f18',
          card: '#101420',
          elevated: '#141926',
        },
        border: {
          DEFAULT: '#1a2035',
          light: '#232d45',
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#8892a4',
          muted: '#4a5568',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.15)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
