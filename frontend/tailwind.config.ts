import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyber-Luxe Gaming Palette
        surface: {
          DEFAULT: "#121222",
          dim: "#121222",
          bright: "#38374a",
          lowest: "#0c0c1d",
          low: "#1a1a2b",
          container: "#1e1e2f",
          high: "#29283a",
          highest: "#333345",
        },
        "on-surface": "#e3e0f8",
        "on-surface-variant": "#cbc3d7",
        primary: "#d0bcff",
        "on-primary": "#3c0091",
        "primary-container": "#a078ff",
        secondary: "#4cd7f6",
        "on-secondary": "#003640",
        "secondary-container": "#03b5d3",
        tertiary: "#ffb95f",
        "on-tertiary": "#472a00",
        outline: "#958ea0",
        "outline-variant": "#494454",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      spacing: {
        "container-max": "1280px",
        gutter: "24px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan": "scan 2s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%, 100%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
