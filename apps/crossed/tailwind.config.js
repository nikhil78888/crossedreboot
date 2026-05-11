/** @type {import('tailwindcss').Config} */

const colors = require("./src/lib/colors");

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: colors,
    },
  },
  plugins: [],
};
