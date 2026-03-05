/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sam's Club theme
        sams: {
          DEFAULT: '#004990',
          dark: '#003366',
          light: '#E8F0FA',
          accent: '#CC0000',
        },
        // Harris Teeter theme
        ht: {
          DEFAULT: '#00843D',
          dark: '#005C2B',
          light: '#E6F5EC',
          accent: '#FFA500',
        },
        // Shared UI colors
        brand: {
          bg: '#F8F9FA',
          card: '#FFFFFF',
          border: '#DEE2E6',
          text: '#212529',
          muted: '#6C757D',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

