/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "crossed-green": {
          50: "#E6FAFA",
          100: "#DCF2F2",
          400: "#79C685",
          700: "#01AC79",
          900: "#354646",
        },
        "crossed-blue": {
          300: "#83C1D7",
          400: "#63A2B8",
        },
        "crossed-black": {
          700: "#354646",
        },
        "crossed-gray": {
          200: "#BDCBCB",
        },
      },
    },
  },
  plugins: [],
};
