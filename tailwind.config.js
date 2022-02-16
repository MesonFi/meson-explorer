const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'primary': '#00B49B',
        'primary-100': 'rgba(0, 180, 155, 0.1)',
        'gray-500': '#9eaea4',
        'warning': '#FFA800',
        'warning-100': 'rgba(255, 168, 0, 0.1)',
        'gradient-start': '#06c17e',
        'gradient-end': '#06c1ab',
      },
    },
  },
  plugins: [],
}
