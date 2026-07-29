/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        andes: {
          light: '#E6FAFF',
          DEFAULT: '#00CAFE',
          dark: '#03335E',
          yellow: '#F5D204'
        },
        success: '#22C55E',
        warning: '#FBBF24',
        error: '#EF4444',
        textMain: '#1F2937',
        bgMain: '#FFFFFF'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
