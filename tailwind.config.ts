import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#e11d2a",
          dark: "#b3131f",
          light: "#ff3b48",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#1e293b",
          muted: "#64748b",
        },
      },
      keyframes: {
        pulseLive: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        live: "pulseLive 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
