import type { Config } from "tailwindcss"
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: "#028090", light: "#A8D5D1", dark: "#026070" },
        forest: { DEFAULT: "#3D5A4E", light: "#4e7264" },
        cream: "#F4F8F7",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] }
    }
  },
  plugins: [],
}
export default config
