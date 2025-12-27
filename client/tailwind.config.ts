import type {Config} from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primaryFrom: '#0ea5e9', // sky-500
        primaryTo: '#0ea5e9', // sky-500 (same for consistency)
        secondaryFrom: '#8b5cf6', // violet-500
        secondaryTo: '#8b5cf6' // violet-500
      },
      backdropBlur: {sm: '4px', md: '8px', lg: '12px'},
      boxShadow: {
        glass: '0 6px 20px rgba(2,6,23,0.3)',
        lift: '0 12px 32px rgba(2,6,23,0.35)'
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      },
      keyframes: {
        'ambient-move': {
          '0%': {transform: 'translate3d(0,0,0) scale(1)'},
          '50%': {transform: 'translate3d(-3%, 4%, 1px) scale(1.05)'},
          '100%': {transform: 'translate3d(2%, -2%, 0) scale(1)'}
        }
      },
      animation: {
        ambient: 'ambient-move 12s ease-in-out infinite'
      }
    }
  },
  plugins: [forms, typography, aspectRatio]
};

export default config;


