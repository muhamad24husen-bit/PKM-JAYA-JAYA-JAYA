/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        nirwana: {
          background: "#0d1515",
          deep: "#0a0e17",
          surface: "#161b26",
          panel: "#192122",
          panelHigh: "#232b2c",
          line: "#3a494b",
          text: "#dce4e4",
          muted: "#b9cacb",
          cyan: "#00f2ff",
          teal: "#008080",
          gold: "#fed83a",
          danger: "#ff4d5e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(0, 242, 255, 0.2)",
        danger: "0 0 22px rgba(255, 77, 94, 0.25)",
      },
      borderRadius: {
        card: "1rem",
      },
    },
  },
  plugins: [],
};
