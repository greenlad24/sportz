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
        // פלטה חמה ורגועה (בהשראת sport5) במקום אדום/לבן חזק
        brand: {
          DEFAULT: "#C0392B", // אדום לבנים חם
          dark: "#9A2D22",
          light: "#D9594A",
        },
        ink: {
          DEFAULT: "#26201d", // שחור-חום רך
          soft: "#4b423c",
          muted: "#8a7d72",
        },
        paper: {
          DEFAULT: "#FAF6EF", // שמנת חמה לרקע
          soft: "#F2EADD",
        },
        line: "#E8DFD1", // גבול חם עדין
        ochre: "#C68A2E", // ענבר חם (כדורסל ישראלי)
        olive: "#6E8B3D", // זית רגוע (כדורגל)
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
