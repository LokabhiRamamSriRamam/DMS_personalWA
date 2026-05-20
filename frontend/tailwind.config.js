
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // Enables dark mode toggling
  theme: {
    screens: {
      xs: '480px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
    },
    extend: {
      colors: {
        // Updated to match the Original HTML Blue
        "primary": "#137fec", 
        // Specific backgrounds from Original HTML
        "background-light": "#f6f7f8",
        "background-dark": "#101922", 
        "card-dark": "#1a2634", 
      },
      fontFamily: {
        // Original HTML used Inter
        "display": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}