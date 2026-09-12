import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#070a13",
          surface: "#0d1424",
          card: "#121b30",
          cardHover: "#17233f",
          border: "#1e2c4a",
          borderLight: "#2a3d66",
          red: "#ef4444",
          redHover: "#dc2626",
          emerald: "#10b981",
          amber: "#f59e0b",
          cyan: "#06b6d4",
          muted: "#94a3b8",
          text: "#f8fafc"
        }
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }
    },
  },
  plugins: [],
};

export default config;
