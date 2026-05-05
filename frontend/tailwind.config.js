/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest:  { DEFAULT: "#0f3b2f", dark: "#0a2a21", light: "#1a5240", lighter: "#1e6048" },
        gold:    { DEFAULT: "#C9A84C", light: "#E8C96A", dark: "#A07A30", glow: "#f0c95a" },
        cream:   "#F5F0E8",
        charcoal: "#1A1A1A",
        muted:   "#9B8B7A",
      },
      fontFamily: {
        cinzel:   ["'Cinzel'", "serif"],
        playfair: ["'Playfair Display'", "serif"],
        lora:     ["'Lora'", "serif"],
      },
      animation: {
        "fade-up":    "fadeUp 0.6s ease forwards",
        "fade-in":    "fadeIn 0.5s ease forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "shimmer":    "shimmer 2s infinite",
        "slide-right":"slideRight 0.5s ease forwards",
      },
      keyframes: {
        fadeUp:     { from: { opacity: 0, transform: "translateY(24px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn:     { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:    { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
        glowPulse:  { "0%,100%": { boxShadow: "0 0 8px rgba(201,168,76,0.4)" }, "50%": { boxShadow: "0 0 24px rgba(201,168,76,0.8)" } },
        slideRight: { from: { opacity: 0, transform: "translateX(-20px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
      backgroundImage: {
        "forest-gradient": "linear-gradient(135deg, #0a2a21 0%, #0f3b2f 50%, #1a5240 100%)",
        "gold-gradient":   "linear-gradient(135deg, #C9A84C, #f0c95a, #A07A30)",
        "card-gradient":   "linear-gradient(135deg, rgba(15,59,47,0.8), rgba(10,42,33,0.95))",
      },
      boxShadow: {
        "gold-glow":  "0 0 20px rgba(201,168,76,0.4)",
        "gold-glow-lg": "0 0 40px rgba(201,168,76,0.6)",
        "forest-card": "0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
