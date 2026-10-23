import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: { 50: "#fffbeb", 100: "#fef3c7", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
        dark: { 50: "#1a1a1a", 100: "#141414", 200: "#0f0f0f", 300: "#0a0a0a", 400: "#050505" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
