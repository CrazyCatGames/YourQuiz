/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void:   '#080b14',
        ink:    '#0e1220',
        slate:  '#151b2e',
        panel:  '#1a2138',
        border: '#232d47',
        muted:  '#3d4f73',
        dim:    '#7a8db0',
        ghost:  '#a8b8d8',
        snow:   '#e8edf8',
        cyan:   {
          DEFAULT: '#00e5ff',
          dim:     '#00b8cc',
          glow:    'rgba(0,229,255,0.15)',
        },
        violet: {
          DEFAULT: '#a855f7',
          dim:     '#7c3aed',
          glow:    'rgba(168,85,247,0.15)',
        },
        emerald: {
          DEFAULT: '#10d48a',
          glow:    'rgba(16,212,138,0.15)',
        },
        rose:    { DEFAULT: '#ff4d6d' },
        amber:   { DEFAULT: '#ffb347' },
      },
      keyframes: {
        'fade-up':    { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in':    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'pop':        { '0%': { transform: 'scale(0.92)', opacity: 0 }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        'timer-bar':  { '0%': { width: '100%' }, '100%': { width: '0%' } },
        'pulse-glow': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        'rank-in':    { '0%': { transform: 'translateX(-20px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        'bounce-in':  { '0%': { transform: 'scale(0)' }, '50%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        'slide-in':   { '0%': { transform: 'translateY(-12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        'spin-slow':  { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease forwards',
        'fade-in':    'fade-in 0.3s ease forwards',
        'pop':        'pop 0.35s ease forwards',
        'timer-bar':  'timer-bar linear forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'rank-in':    'rank-in 0.4s ease forwards',
        'bounce-in':  'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'slide-in':   'slide-in 0.3s ease forwards',
        'spin-slow':  'spin-slow 3s linear infinite',
      },
      boxShadow: {
        'cyan':   '0 0 24px rgba(0,229,255,0.25)',
        'violet': '0 0 24px rgba(168,85,247,0.25)',
        'glow-sm': '0 0 12px rgba(0,229,255,0.15)',
        'card':   '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
