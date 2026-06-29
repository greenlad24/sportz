import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        // רוחב התוכן של האתר (הרקעים נשארים ברוחב מלא)
        site: "988px",
      },
      fontFamily: {
        // סטאק גופנים סטנדרטי בסגנון ESPN (Helvetica/Arial)
        sans: [
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          '"Arial Hebrew"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // רקע לבן וטקסט כהה בסגנון ESPN, עם דגש אדום
        brand: {
          DEFAULT: "#C0392B",
          dark: "#9A2D22",
          light: "#D9594A",
        },
        ink: {
          DEFAULT: "#1a1a1a", // טקסט ראשי כמעט-שחור
          soft: "#3f3f42",
          muted: "#6b6b70",
        },
        paper: {
          DEFAULT: "#ffffff", // רקע לבן
          soft: "#f2f3f5", // אפור בהיר מאוד למקטעים
        },
        line: "#e3e3e6", // גבול אפור עדין
        ochre: "#C68A2E",
        olive: "#6E8B3D",
        court: "#1D5BBF", // כחול ל-NBA (קטגוריית חדשות ה-NBA)
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
