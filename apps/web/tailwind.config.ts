import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#111111",
          50: "#2a2a2a",
          100: "#222222",
          200: "#1a1a1a",
          300: "#111111",
          400: "#0a0a0a",
          500: "#050505",
        },
        slate: {
          gray: "#1F2937",
          dark: "#111827",
          light: "#374151",
        },
        concrete: {
          DEFAULT: "#6B7280",
          light: "#9CA3AF",
          dark: "#4B5563",
        },
        gold: {
          DEFAULT: "#C6A15B",
          light: "#D4B483",
          dark: "#A8854A",
          muted: "#8B6E3A",
        },
        steel: "#9CA3AF",
        "off-white": "#F9FAFB",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.8s ease forwards",
        "slide-up": "slideUp 0.6s ease forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-gold": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(198,161,91,0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 10px rgba(198,161,91,0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gold-shimmer": "linear-gradient(90deg, transparent, rgba(198,161,91,0.3), transparent)",
      },
      boxShadow: {
        gold: "0 0 20px rgba(198,161,91,0.3)",
        "gold-lg": "0 0 40px rgba(198,161,91,0.2)",
        "gold-sm": "0 0 10px rgba(198,161,91,0.2)",
        dark: "0 4px 32px rgba(0,0,0,0.6)",
        "dark-lg": "0 8px 64px rgba(0,0,0,0.8)",
      },
      borderColor: {
        gold: "#C6A15B",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
