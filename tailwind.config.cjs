/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        anffas: {
          blue: "#004A98",
          light: "#6EB6FF",
          yellow: "#FFD43B",
          bg: "#F5F7FA",
          text: "#1F2937",
        }
      },
    },
  },
  plugins: [],
}
