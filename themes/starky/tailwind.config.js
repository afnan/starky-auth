/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./login/**/*.ftl",
    "./src/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        starky: {
          bg: "#0b1220",
          fg: "#e5e7eb",
          accent: "#6366f1"
        }
      }
    }
  },
  plugins: []
};
